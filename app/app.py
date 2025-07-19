from flask import Flask, render_template, request, jsonify
from database import db, Startup, Event, init_db
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////data/startup_advisor.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
init_db(app)

@app.route('/')
def index():
    return render_template('index.html')

# API Endpoints
@app.route('/api/startups', methods=['GET', 'POST'])
def handle_startups():
    if request.method == 'POST':
        data = request.get_json()
        new_startup = Startup(
            company_name=data['companyName'],
            website=data.get('website'),
            ceo_contact=data['ceoContact'],
            description=data['description'],
            offering=data['offering'],
            sector=data['sector'],
            seeking=data.get('seeking'),
            target=data.get('target')
        )
        db.session.add(new_startup)
        db.session.commit()
        return jsonify(new_startup.to_dict()), 201
    
    startups = Startup.query.order_by(Startup.created_at.desc()).all()
    return jsonify([s.to_dict() for s in startups])

@app.route('/api/startups/<int:id>', methods=['DELETE'])
def delete_startup(id):
    startup = Startup.query.get_or_404(id)
    
    # Delete related events first
    Event.query.filter_by(startup_id=id).delete()
    
    db.session.delete(startup)
    db.session.commit()
    return jsonify({'message': 'Startup deleted successfully'}), 200

@app.route('/api/events', methods=['GET', 'POST'])
def handle_events():
    if request.method == 'POST':
        data = request.get_json()
        new_event = Event(
            startup_id=data['startupId'],
            startup_name=data['startupName'],
            contact_company=data['contactCompany'],
            contact_person=data['contactPerson'],
            contact_email=data.get('contactEmail'),
            notes=data.get('notes')
        )
        db.session.add(new_event)
        db.session.commit()
        return jsonify(new_event.to_dict()), 201
    
    events = Event.query.order_by(Event.created_at.desc()).all()
    return jsonify([e.to_dict() for e in events])

@app.route('/api/stats')
def get_stats():
    total_startups = Startup.query.count()
    total_connections = Event.query.count()
    
    sectors = db.session.query(Startup.sector).distinct().all()
    total_sectors = len(sectors)
    
    recent_startups = Startup.query.order_by(Startup.created_at.desc()).limit(5).all()
    
    return jsonify({
        'totalStartups': total_startups,
        'totalConnections': total_connections,
        'totalSectors': total_sectors,
        'recentStartups': [s.to_dict() for s in recent_startups]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)