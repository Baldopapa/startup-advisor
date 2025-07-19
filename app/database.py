from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Startup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(200), nullable=False)
    website = db.Column(db.String(200))
    ceo_contact = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    offering = db.Column(db.Text, nullable=False)
    sector = db.Column(db.String(100), nullable=False)
    seeking = db.Column(db.Text)
    target = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'companyName': self.company_name,
            'website': self.website,
            'ceoContact': self.ceo_contact,
            'description': self.description,
            'offering': self.offering,
            'sector': self.sector,
            'seeking': self.seeking,
            'target': self.target,
            'createdAt': self.created_at.isoformat()
        }

class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startup.id'), nullable=False)
    startup_name = db.Column(db.String(200), nullable=False)
    contact_company = db.Column(db.String(200), nullable=False)
    contact_person = db.Column(db.String(200), nullable=False)
    contact_email = db.Column(db.String(200))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'startupId': self.startup_id,
            'startupName': self.startup_name,
            'contactCompany': self.contact_company,
            'contactPerson': self.contact_person,
            'contactEmail': self.contact_email,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat()
        }

def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()