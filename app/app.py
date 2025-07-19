from flask import Flask, render_template, request, jsonify
from database import db, Startup, Event, init_db
from fpdf import FPDF
from fpdf.enums import XPos, YPos
from datetime import datetime
from flask import send_file
import tempfile
import os

app = Flask(__name__)

# configurazione per docker
# app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////data/startup_advisor.db'

# configurazione per esecuzione locale
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///startup_advisor.db'

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

@app.route('/api/startups/<int:id>', methods=['PUT'])
def update_startup(id):
    startup = Startup.query.get_or_404(id)
    data = request.get_json()
    
    startup.company_name = data['companyName']
    startup.website = data.get('website')
    startup.ceo_contact = data['ceoContact']
    startup.description = data['description']
    startup.offering = data['offering']
    startup.sector = data['sector']
    startup.seeking = data.get('seeking')
    startup.target = data.get('target')
    
    db.session.commit()
    return jsonify(startup.to_dict()), 200

# Generate PDF Report
@app.route('/api/generate-pdf', methods=['POST'])
def generate_pdf():
    try:
        data = request.get_json()
        selected_startups = data['selectedStartups']
        print(f"Selected startups for PDF: {selected_startups}")

        # Verifica che ci siano startup selezionate
        if not selected_startups:
            return jsonify({"error": "Nessuna startup selezionata"}), 400

        # Crea il PDF in un file temporaneo
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmpfile:
            pdf = FPDF()
            pdf.add_page()

            # filepath: /Users/maurobaldoni/Documents/dev/startup-advisor/app/app.py
            font_path_regular = os.path.join(os.path.dirname(__file__), 'static', 'fonts', 'DejaVuSans.ttf')
            font_path_bold = os.path.join(os.path.dirname(__file__), 'static', 'fonts', 'DejaVuSans-Bold.ttf')
            font_path_italic = os.path.join(os.path.dirname(__file__), 'static', 'fonts', 'DejaVuSans-Oblique.ttf')
            pdf.add_font('DejaVu', '', font_path_regular)
            pdf.add_font('DejaVu', 'B', font_path_bold)
            pdf.add_font('DejaVu', 'I', font_path_italic)
            pdf.set_font('DejaVu', '', 10)
            
            # Configurazione del documento
            pdf.set_auto_page_break(auto=True, margin=15)
            
            # Logo (gestisce l'assenza del logo)
            try:
                logo_path = os.path.join(os.path.dirname(__file__), 'static', 'logo.png')
                if os.path.exists(logo_path):
                    pdf.image(logo_path, x=10, y=8, w=16)
            except:
                pass  # Continua senza logo se c'è un problema
            
            # Titolo del report
            pdf.set_font('DejaVu', 'B', 25)
            pdf.set_xy(0, 8)
            pdf.cell(0, 12, "Startup Advisor", 0, align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            pdf.ln(5)

            # Data di estrazione
            pdf.set_font('DejaVu', '', 10)
            pdf.set_xy(0, 20)
            mesi = [
                "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
            ]
            now = datetime.now()
            data_estrazione = f"{now.day} {mesi[now.month - 1]} {now.year}"
            pdf.cell(0, 10, f"Data estrazione: {data_estrazione}", 0, 1, 'R')
            # Titolo
            pdf.set_font('DejaVu', 'B', 16)
            pdf.set_xy(0, 35)
            pdf.cell(0, 10, "Startup Selezionate", 0, align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            pdf.ln(5)
            
            # Contenuto
            for i, startup_id in enumerate(selected_startups, 1):
                startup = db.session.get(Startup, startup_id)
                print(f"Processing startup ID: {startup_id}, Data: {startup}")
                if not startup:
                    continue
                    
                # Intestazione startup
                pdf.set_fill_color(200, 220, 255)
                pdf.set_font('DejaVu', 'B', 12)
                pdf.cell(0, 10, f"{i}. {startup.company_name}", 0, 1, 'L', fill=True)
                
                # Dettagli
                pdf.set_font('DejaVu', '', 10)
                details = [
                    f"\u2022 Settore: {startup.sector}",
                    # f"\u2022 CEO: {startup.ceo_contact}",
                    f"\u2022 Sito web: {startup.website or 'N/D'}",
                    f"\u2022 Descrizione: {startup.description}",
                    f"\u2022 Offerta: {startup.offering}",
                    f"\u2022 Cercano: {startup.seeking or 'N/D'}",
                    f"\u2022 Aziende Target: {startup.target or 'N/D'}"
                ]

                # Stampa le chiavi in neretto
                for detail in details:
                    key, value = detail.split(":", 1)
                    pdf.set_font('DejaVu', 'B', 10)
                    pdf.write(7, key + ": ")
                    pdf.set_font('DejaVu', '', 10)
                    pdf.write(7, value.strip())
                    pdf.ln(7)
                
                pdf.ln(5)
            
            # Footer
            pdf.set_y(-25)
            pdf.set_font('DejaVu', 'I', 8)
            pdf.cell(0, 10, "Made with ❤️ by Mauro Baldoni | Contatti: mauro.baldoni@gmail.com", 0, align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)

            # Salva nel file temporaneo
            pdf.output(tmpfile.name)
            
            # Invia il file
            return send_file(
                tmpfile.name,
                as_attachment=True,
                download_name=f"startup_report_{datetime.now().strftime('%Y%m%d')}.pdf",
                mimetype='application/pdf'
            )
            
    except Exception as e:
        print("Errore PDF:", e)
        return jsonify({"error": str(e)}), 500
        
if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)