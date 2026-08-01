from sqlalchemy.orm import Session

from app.models.export import Export


class ExportRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, export_id: int) -> Export | None:
        return self.db.get(Export, export_id)

    def create(self, export: Export) -> Export:
        self.db.add(export)
        self.db.flush()
        return export

    def update(self, export: Export) -> Export:
        self.db.flush()
        return export
