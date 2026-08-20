import SwiftUI

struct IdeaListView: View {
    @State private var ideas: [Idea] = []
    @State private var connections: [Connection] = []
    @State private var q: String = ""
    @State private var filterTag: String = "Alle"
    @State private var editing: Idea?
    @State private var selected: Idea?
    @State private var showingForm = false
    @State private var loading = true
    @State private var error: String?
    @State private var toast: String?

    private var allTags: [String] {
        let s = Set(ideas.flatMap { $0.tags })
        return ["Alle"] + s.sorted()
    }

    private var filtered: [Idea] {
        ideas.filter { idea in
            if filterTag != "Alle" && !idea.tags.contains(filterTag) { return false }
            if !q.isEmpty {
                let hay = "\(idea.title) \(idea.description ?? "") \(idea.tags.joined(separator: " ")) \(idea.source ?? "")".lowercased()
                if !hay.contains(q.lowercased()) { return false }
            }
            return true
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            if loading {
                ProgressView("Lade Ideen…").frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = error {
                VStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle").foregroundStyle(.red)
                    Text(error).font(.system(size: 12)).foregroundStyle(.secondary)
                    Button("Neu laden") { Task { await fetchAll() } }
                }.frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                HSplitView {
                    formPane.frame(minWidth: 340, idealWidth: 380, maxWidth: 420)
                    listPane.frame(minWidth: 400)
                }
            }
        }
        .task { await fetchAll() }
        .sheet(isPresented: $showingForm) {
            IdeaFormView(idea: editing) { result in
                showingForm = false
                editing = nil
                await handleForm(result: result)
            } onCancel: {
                showingForm = false
                editing = nil
            }
            .frame(width: 520, height: 420)
        }
        .sheet(item: $selected) { idea in
            IdeaDetailSheet(idea: idea, onEdit: {
                selected = nil
                editing = idea
                showingForm = true
            }, onDelete: {
                selected = nil
                Task { await deleteIdea(id: idea.id) }
            })
        }
        .overlay(alignment: .bottom) {
            if let toast = toast {
                Text(toast).font(.system(size: 12, weight: .medium)).padding(.horizontal, 14).padding(.vertical, 8).background(Capsule().fill(Color.primary).foregroundStyle(Color(nsColor: .windowBackgroundColor))).shadow(radius: 8).padding(.bottom, 20).transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
    }

    private var header: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Ideen").font(.system(size: 20, weight: .semibold, design: .rounded))
                Text("\(filtered.count) von \(ideas.count) Ideen").font(.system(size: 11)).foregroundStyle(.secondary)
            }
            Spacer()
            HStack(spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass").foregroundStyle(.secondary).font(.system(size: 11))
                    TextField("Suche Titel, Beschreibung, Tags…", text: $q).font(.system(size: 12)).textFieldStyle(.plain).frame(width: 220)
                    if !q.isEmpty {
                        Button { q = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary).font(.system(size: 11)) }.buttonStyle(.plain)
                    }
                }.padding(.horizontal, 10).padding(.vertical, 6).background(RoundedRectangle(cornerRadius: 8).fill(Color(nsColor: .controlBackgroundColor)).overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)))
                Picker("", selection: $filterTag) {
                    ForEach(allTags, id: \.self) { t in Text(t == "Alle" ? "Alle Tags" : "#\(t)").tag(t) }
                }.frame(width: 140).labelsHidden()
                Button { editing = nil; showingForm = true } label: {
                    Label("Neue Idee", systemImage: "plus").font(.system(size: 12, weight: .medium))
                }.buttonStyle(.borderedProminent).controlSize(.small).tint(.indigo)
            }
        }.padding(16).background(Color(nsColor: .windowBackgroundColor))
    }

    private var formPane: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Inline form for create
                IdeaInlineForm(onSubmit: { data in await createIdea(data) })
                ConnectionFormInline(ideas: ideas, preselectedSource: selected?.id) {
                    Task { await fetchAll() }
                }
                if let sel = selected {
                    let related = connections.filter { $0.sourceId == sel.id || $0.targetId == sel.id }
                    if !related.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Verbindungen • \(sel.title)").font(.system(size: 11, weight: .medium)).tracking(0.5).foregroundStyle(.secondary).textCase(.uppercase)
                            ForEach(related) { c in
                                let otherId = c.sourceId == sel.id ? c.targetId : c.sourceId
                                let other = ideas.first(where: { $0.id == otherId })
                                HStack(spacing: 8) {
                                    Text(c.type).font(.system(size: 11, weight: .semibold)).foregroundStyle(.indigo)
                                    Text(c.sourceId == sel.id ? "→" : "←").foregroundStyle(.secondary)
                                    Text(other?.title ?? "#\(otherId)").font(.system(size: 12, weight: .medium)).lineLimit(1)
                                    if let label = c.label, !label.isEmpty { Text("(\(label))").font(.system(size: 11)).foregroundStyle(.secondary) }
                                    Spacer()
                                    Button(role: .destructive) { Task { await deleteConnection(id: c.id) } } label: { Image(systemName: "xmark").font(.system(size: 10, weight: .bold)) }.buttonStyle(.plain).foregroundStyle(.red)
                                }.padding(8).background(RoundedRectangle(cornerRadius: 8).fill(Color(nsColor: .windowBackgroundColor)).overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)))
                            }
                        }.padding(12).background(RoundedRectangle(cornerRadius: 12).fill(Color(nsColor: .controlBackgroundColor)).overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)))
                    }
                }
            }.padding(16)
        }.background(Color(nsColor: .controlBackgroundColor).opacity(0.3))
    }

    private var listPane: some View {
        ScrollView {
            if filtered.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "lightbulb.slash").font(.system(size: 28)).foregroundStyle(.secondary)
                    Text("Keine Ideen gefunden").font(.system(size: 13, weight: .semibold))
                    Text("Erstelle deine erste Idee oder passe Filter an.").font(.system(size: 12)).foregroundStyle(.secondary)
                }.frame(maxWidth: .infinity).padding(.vertical, 60).background(RoundedRectangle(cornerRadius: 12).strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4])).foregroundStyle(Color(nsColor: .separatorColor))).padding(24)
            } else {
                LazyVStack(spacing: 10) {
                    ForEach(filtered) { idea in
                        IdeaRow(idea: idea, isSelected: selected?.id == idea.id, onSelect: { selected = idea }, onEdit: { editing = idea; showingForm = true }, onDelete: { Task { await deleteIdea(id: idea.id) } })
                    }
                }.padding(16)
            }
        }
    }

    // MARK: Actions
    private func fetchAll() async {
        loading = true
        do {
            async let ideasTask = APIClient.shared.listIdeas()
            async let cs = APIClient.shared.listConnections()
            ideas = try await ideasTask
            connections = try await cs
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }

    private func createIdea(_ data: IdeaCreate) async {
        do {
            _ = try await APIClient.shared.createIdea(data)
            await fetchAll(); showToast("Idee erstellt")
        } catch { showToast("Fehler: \(error.localizedDescription)") }
    }

    private func handleForm(result: IdeaFormResult) async {
        switch result {
        case .create(let data):
            await createIdea(data)
        case .update(let id, let data):
            do {
                _ = try await APIClient.shared.updateIdea(id: id, data)
                await fetchAll(); showToast("Idee aktualisiert")
            } catch { showToast("Fehler: \(error.localizedDescription)") }
        }
    }

    private func deleteIdea(id: Int) async {
        do {
            try await APIClient.shared.deleteIdea(id: id)
            await fetchAll(); showToast("Idee gelöscht")
        } catch { showToast("Fehler: \(error.localizedDescription)") }
    }

    private func deleteConnection(id: Int) async {
        do {
            try await APIClient.shared.deleteConnection(id: id)
            await fetchAll(); showToast("Verbindung entfernt")
        } catch { showToast("Fehler: \(error.localizedDescription)") }
    }

    private func showToast(_ msg: String) {
        toast = msg
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) { toast = nil }
    }
}

struct IdeaRow: View {
    var idea: Idea
    var isSelected: Bool
    var onSelect: () -> Void
    var onEdit: () -> Void
    var onDelete: () -> Void

    @State private var hovered = false

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8).fill(Color(nsColor: .controlBackgroundColor)).frame(width: 36, height: 36).overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1))
                Text(String(idea.title.prefix(1).uppercased())).font(.system(size: 13, weight: .semibold))
            }
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Text(idea.title).font(.system(size: 13, weight: .semibold)).lineLimit(1)
                    if hovered { Image(systemName: "arrow.right.circle.fill").foregroundStyle(.indigo).font(.system(size: 11)) }
                    Spacer()
                    Text(idea.createdAt, style: .date).font(.system(size: 10)).foregroundStyle(.secondary).padding(.horizontal, 6).padding(.vertical, 2).background(Capsule().fill(Color(nsColor: .controlBackgroundColor)).overlay(Capsule().stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)))
                }
                if let desc = idea.description, !desc.isEmpty {
                    Text(desc).font(.system(size: 12)).foregroundStyle(.secondary).lineLimit(2)
                }
                HStack(spacing: 6) {
                    ForEach(idea.tags, id: \.self) { t in
                        Text("#\(t)").font(.system(size: 10, weight: .medium)).padding(.horizontal, 6).padding(.vertical, 2).background(Capsule().fill(Color(nsColor: .windowBackgroundColor)).overlay(Capsule().stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1))).foregroundStyle(.secondary)
                    }
                    if idea.tags.isEmpty { Text("ohne Tags").font(.system(size: 10)).foregroundStyle(.secondary.opacity(0.7)) }
                    Spacer()
                    if let src = idea.source, !src.isEmpty {
                        Label(src, systemImage: "link").font(.system(size: 10)).foregroundStyle(.secondary).lineLimit(1)
                    }
                }
            }
            VStack(spacing: 4) {
                Button("Bearbeiten", action: onEdit).font(.system(size: 11, weight: .medium)).buttonStyle(.bordered).controlSize(.small)
                Button("Löschen", role: .destructive, action: onDelete).font(.system(size: 11)).buttonStyle(.bordered).controlSize(.small).tint(.red)
            }.opacity(hovered ? 1 : 0)
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 12).fill(isSelected ? Color.indigo.opacity(0.12) : Color(nsColor: .controlBackgroundColor)).overlay(RoundedRectangle(cornerRadius: 12).stroke(isSelected ? Color.indigo.opacity(0.4) : Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)).shadow(color: .black.opacity(hovered ? 0.15 : 0), radius: 8, x: 0, y: 4))
        .onHover { hovered = $0 }
        .contentShape(Rectangle())
        .onTapGesture { onSelect() }
        .animation(.easeInOut(duration: 0.15), value: hovered)
    }
}

struct IdeaDetailSheet: View {
    var idea: Idea
    var onEdit: () -> Void
    var onDelete: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                ZStack {
                    RoundedRectangle(cornerRadius: 10).fill(LinearGradient(colors: [.indigo, .purple], startPoint: .topLeading, endPoint: .bottomTrailing)).frame(width: 40, height: 40)
                    Text(String(idea.title.prefix(1).uppercased())).font(.system(size: 16, weight: .bold)).foregroundStyle(.white)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(idea.title).font(.system(size: 16, weight: .semibold))
                    Text(idea.createdAt, style: .date).font(.system(size: 11)).foregroundStyle(.secondary)
                }
                Spacer()
                Button { dismiss() } label: { Image(systemName: "xmark").font(.system(size: 11, weight: .bold)).frame(width: 28, height: 28).background(Circle().fill(Color(nsColor: .controlBackgroundColor))) }.buttonStyle(.plain)
            }
            if let desc = idea.description, !desc.isEmpty {
                Text(desc).font(.system(size: 13)).foregroundStyle(.secondary).lineSpacing(2).fixedSize(horizontal: false, vertical: true)
            }
            if let src = idea.source, !src.isEmpty {
                HStack { Text("Quelle").font(.system(size: 11, weight: .medium)).foregroundStyle(.secondary).textCase(.uppercase).tracking(0.5); Spacer(); Text(src).font(.system(size: 12)).foregroundStyle(.primary) }.padding(10).background(RoundedRectangle(cornerRadius: 8).fill(Color(nsColor: .controlBackgroundColor)).overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)))
            }
            FlowLayout(spacing: 6) {
                ForEach(idea.tags, id: \.self) { t in Text("#\(t)").font(.system(size: 11, weight: .medium)).padding(.horizontal, 8).padding(.vertical, 4).background(Capsule().fill(Color.indigo.opacity(0.15)).overlay(Capsule().stroke(Color.indigo.opacity(0.3), lineWidth: 1))).foregroundStyle(.indigo) }
            }
            HStack(spacing: 8) {
                Button(action: onEdit) { Label("Bearbeiten", systemImage: "pencil").font(.system(size: 12, weight: .medium)) }.buttonStyle(.bordered).controlSize(.regular)
                Button(role: .destructive, action: onDelete) { Label("Löschen", systemImage: "trash").font(.system(size: 12, weight: .medium)) }.buttonStyle(.bordered).tint(.red).controlSize(.regular)
                Spacer()
            }
            Spacer()
        }.padding(20).frame(width: 460).background(Color(nsColor: .windowBackgroundColor))
    }
}

// MARK: - Inline Forms
struct IdeaInlineForm: View {
    var onSubmit: (IdeaCreate) async -> Void
    @State private var title = ""
    @State private var description = ""
    @State private var source = ""
    @State private var tagsStr = ""
    @State private var saving = false
    @State private var error: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Label("Neue Idee", systemImage: "plus.circle.fill").font(.system(size: 12, weight: .semibold)).foregroundStyle(.indigo)
                Spacer()
                if saving { ProgressView().scaleEffect(0.6) }
            }
            VStack(spacing: 8) {
                TextField("Titel *", text: $title).textFieldStyle(.roundedBorder).font(.system(size: 12))
                TextField("Beschreibung", text: $description, axis: .vertical).lineLimit(2...4).textFieldStyle(.roundedBorder).font(.system(size: 12))
                HStack(spacing: 8) {
                    TextField("Quelle / Referenz", text: $source).textFieldStyle(.roundedBorder).font(.system(size: 12))
                    TextField("Tags, komma-getrennt", text: $tagsStr).textFieldStyle(.roundedBorder).font(.system(size: 12))
                }
            }
            if let error = error { Text(error).font(.system(size: 11)).foregroundStyle(.red).padding(6).background(RoundedRectangle(cornerRadius: 6).fill(Color.red.opacity(0.1))) }
            Button {
                Task {
                    guard !title.trimmingCharacters(in: .whitespaces).isEmpty else { error = "Titel darf nicht leer sein"; return }
                    saving = true; defer { saving = false }
                    let tags = tagsStr.split(separator: ",").map{ $0.trimmingCharacters(in: .whitespaces) }.filter{ !$0.isEmpty }
                    await onSubmit(IdeaCreate(title: title.trimmingCharacters(in: .whitespaces), description: description.isEmpty ? nil : description, source: source.isEmpty ? nil : source, tags: tags))
                    title=""; description=""; source=""; tagsStr=""; error=nil
                }
            } label: { Label(saving ? "Speichert…" : "Erstellen", systemImage: "arrow.right.circle.fill").font(.system(size: 12, weight: .medium)) }.buttonStyle(.borderedProminent).controlSize(.small).tint(.indigo).disabled(saving || title.isEmpty)
        }.padding(12).background(RoundedRectangle(cornerRadius: 12).fill(Color(nsColor: .controlBackgroundColor)).overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)))
    }
}

struct ConnectionFormInline: View {
    var ideas: [Idea]
    var preselectedSource: Int?
    var onCreated: () -> Void
    @State private var sourceId: Int?
    @State private var targetId: Int?
    @State private var type: ConnectionType = .aehnlich
    @State private var label: String = ""
    @State private var saving = false
    @State private var error: String?
    @State private var ok: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Verbindung", systemImage: "point.3.connected.trianglepath.dotted").font(.system(size: 12, weight: .semibold)).foregroundStyle(.primary)
            HStack(spacing: 8) {
                Picker("Quelle", selection: $sourceId) {
                    Text("— Quelle —").tag(nil as Int?)
                    ForEach(ideas) { i in Text(i.title).tag(Optional(i.id)) }
                }.frame(maxWidth: .infinity).labelsHidden()
                Picker("Ziel", selection: $targetId) {
                    Text("— Ziel —").tag(nil as Int?)
                    ForEach(ideas) { i in Text(i.title).tag(Optional(i.id)) }
                }.frame(maxWidth: .infinity).labelsHidden()
            }
            Picker("Typ", selection: $type) {
                ForEach(ConnectionType.allCases) { t in Text(t.rawValue).tag(t) }
            }.pickerStyle(.segmented).labelsHidden()
            TextField("Label / Beschreibung (optional)", text: $label).textFieldStyle(.roundedBorder).font(.system(size: 12))
            if let error = error { Text(error).font(.system(size: 11)).foregroundStyle(.red) }
            if let ok = ok { Text(ok).font(.system(size: 11)).foregroundStyle(.green) }
            Button {
                Task {
                    guard let s = sourceId, let t = targetId else { error = "Quelle und Ziel wählen"; return }
                    guard s != t else { error = "Quelle und Ziel dürfen nicht gleich sein"; return }
                    saving = true; defer { saving = false }
                    do {
                        _ = try await APIClient.shared.createConnection(ConnectionCreate(sourceId: s, targetId: t, type: type.rawValue, label: label.isEmpty ? nil : label))
                        ok = "Verbindung erstellt"; error = nil; targetId = nil; label = ""; onCreated()
                        DispatchQueue.main.asyncAfter(deadline: .now()+2) { ok = nil }
                    } catch let e { self.error = e.localizedDescription; ok = nil }
                }
            } label: { Label(saving ? "Verbinde…" : "Verbinden", systemImage: "link").font(.system(size: 12, weight: .medium)) }.buttonStyle(.bordered).controlSize(.small).disabled(saving)
            Text("Tipp: Klick im Graph öffnet Details.").font(.system(size: 10)).foregroundStyle(.secondary)
        }.padding(12).background(RoundedRectangle(cornerRadius: 12).fill(Color(nsColor: .controlBackgroundColor)).overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(nsColor: .separatorColor).opacity(0.5), lineWidth: 1)))
        .onAppear { if let p = preselectedSource { sourceId = p } }
        .onChange(of: preselectedSource) { new in if let n = new { sourceId = n } }
    }
}
