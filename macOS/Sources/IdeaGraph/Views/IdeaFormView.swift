import SwiftUI

enum IdeaFormResult {
    case create(IdeaCreate)
    case update(id: Int, IdeaUpdate)
}

struct IdeaFormView: View {
    var idea: Idea?
    var onSubmit: (IdeaFormResult) async -> Void
    var onCancel: () -> Void

    @State private var title: String = ""
    @State private var description: String = ""
    @State private var source: String = ""
    @State private var tagsStr: String = ""
    @State private var saving = false
    @State private var error: String?

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text(idea == nil ? "Neue Idee" : "Idee bearbeiten").font(.system(size: 16, weight: .semibold))
                Spacer()
                Button("Abbrechen", action: onCancel).buttonStyle(.bordered).controlSize(.small)
                Button(idea == nil ? "Erstellen" : "Speichern") {
                    Task {
                        guard !title.trimmingCharacters(in: .whitespaces).isEmpty else { error = "Titel darf nicht leer sein"; return }
                        saving = true
                        let tags = tagsStr.split(separator: ",").map{ $0.trimmingCharacters(in: .whitespaces) }.filter{ !$0.isEmpty }
                        if let idea = idea {
                            let upd = IdeaUpdate(title: title, description: description.isEmpty ? nil : description, source: source.isEmpty ? nil : source, tags: tags)
                            await onSubmit(.update(id: idea.id, upd))
                        } else {
                            let create = IdeaCreate(title: title, description: description.isEmpty ? nil : description, source: source.isEmpty ? nil : source, tags: tags)
                            await onSubmit(.create(create))
                        }
                        saving = false
                    }
                }.buttonStyle(.borderedProminent).tint(.indigo).controlSize(.small).disabled(saving || title.isEmpty)
            }
            Divider()
            Form {
                TextField("Titel *", text: $title).textFieldStyle(.roundedBorder)
                TextField("Beschreibung", text: $description, axis: .vertical).lineLimit(3...6).textFieldStyle(.roundedBorder)
                TextField("Quelle / Referenz", text: $source).textFieldStyle(.roundedBorder)
                TextField("Tags, komma-getrennt (z. B. ki, netzwerk)", text: $tagsStr).textFieldStyle(.roundedBorder)
            }.formStyle(.grouped)
            if let error = error {
                Text(error).font(.system(size: 11)).foregroundStyle(.red).padding(8).background(RoundedRectangle(cornerRadius: 6).fill(Color.red.opacity(0.1))).frame(maxWidth: .infinity, alignment: .leading)
            }
            Spacer()
            if saving { ProgressView("Speichert…").controlSize(.small) }
        }.padding(16).frame(width: 500, height: 420).onAppear {
            if let idea = idea {
                title = idea.title; description = idea.description ?? ""; source = idea.source ?? ""; tagsStr = idea.tags.joined(separator: ", ")
            }
        }
    }
}
