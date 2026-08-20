from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Idea(Base):
    __tablename__ = "ideas"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    source = Column(String(300), nullable=True)
    tags = Column(Text, nullable=True)  # JSON-encoded list
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # optional: backrefs for connections
    outgoing = relationship("Connection", foreign_keys="Connection.source_id", back_populates="source", cascade="all, delete-orphan")
    incoming = relationship("Connection", foreign_keys="Connection.target_id", back_populates="target", cascade="all, delete-orphan")


class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False, index=True)
    target_id = Column(Integer, ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # "entstand aus", "ähnlich zu", "kontrastiert mit"
    label = Column(String(200), nullable=True)  # optional extra description
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    source = relationship("Idea", foreign_keys=[source_id], back_populates="outgoing")
    target = relationship("Idea", foreign_keys=[target_id], back_populates="incoming")
