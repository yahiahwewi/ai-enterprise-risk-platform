"""
Generate 20 realistic, diverse invoice PDFs for testing the AI extraction pipeline.

Covers: Tunisian telecom, utilities, freelance, medical, construction, IT services,
restaurant supply, import/export, consulting, government, rental, insurance, etc.

Each invoice has a different layout, language mix, TVA rate, and formatting style.
"""

import os
import random
from datetime import datetime, timedelta
from fpdf import FPDF

OUT_DIR = os.path.join(os.path.dirname(__file__), "INVOICES TYPES")
os.makedirs(OUT_DIR, exist_ok=True)


def rand_date(start_days_ago=365, end_days_ago=10):
    d = datetime.now() - timedelta(days=random.randint(end_days_ago, start_days_ago))
    return d


def fmt_date(d, style="fr"):
    if style == "fr":
        return d.strftime("%d/%m/%Y")
    elif style == "iso":
        return d.strftime("%Y-%m-%d")
    else:
        return d.strftime("%m/%d/%Y")


def fmt_num(n, decimals=3):
    return f"{n:,.{decimals}f}".replace(",", " ")


# ── Invoice data templates ─────────────────────────────────
invoices = [
    # 1. Tunisian Telecom (Orange style)
    {
        "filename": "01_Orange_Tunisie_Telecom.pdf",
        "company": "Orange Tunisie SA",
        "company_addr": "Centre Urbain Nord, 1082 Tunis",
        "company_mf": "000/M/A/M/000",
        "client": "Mohamed Ben Ali",
        "client_addr": "15, Rue Ibn Khaldoun\n5100 Mahdia",
        "client_id": "CNT09284731",
        "inv_no": "2024-TN-00847291",
        "items": [("Forfait Flybox Max (Voix + Internet)", 1, 35.000), ("Frais de location modem", 1, 5.000)],
        "tva_rate": 7, "lang": "fr", "date_style": "fr", "color": (255, 102, 0),
    },
    # 2. STEG (Electricity)
    {
        "filename": "02_STEG_Electricite.pdf",
        "company": "STEG - Societe Tunisienne de l'Electricite et du Gaz",
        "company_addr": "38, Rue Kamel Ataturk, 1002 Tunis",
        "company_mf": "001234/W/A/M/000",
        "client": "Societe Tac-Tic SARL",
        "client_addr": "Zone Industrielle, 2035 Charguia",
        "client_id": "REF-EL-2024-9382",
        "inv_no": "EL-2024-193847",
        "items": [("Consommation electrique - Octobre 2024 (4500 kWh)", 1, 312.450), ("Taxe municipale", 1, 15.620), ("Redevance RAT", 1, 3.000)],
        "tva_rate": 19, "lang": "fr", "date_style": "fr", "color": (0, 100, 180),
    },
    # 3. SONEDE (Water)
    {
        "filename": "03_SONEDE_Eau.pdf",
        "company": "SONEDE - Societe Nationale d'Exploitation et de Distribution des Eaux",
        "company_addr": "Avenue Slimane Ben Slimane, 1002 Tunis",
        "company_mf": "005678/B/A/M/000",
        "client": "Ahmed Trabelsi",
        "client_addr": "22, Avenue Habib Bourguiba\n4000 Sousse",
        "client_id": "AB-SOU-2024-112",
        "inv_no": "EAU-2024-55120",
        "items": [("Consommation eau potable - T3 2024 (45 m3)", 1, 28.350), ("Assainissement", 1, 14.175), ("Taxe de branchement", 1, 2.000)],
        "tva_rate": 7, "lang": "fr", "date_style": "fr", "color": (0, 120, 200),
    },
    # 4. Freelance Designer
    {
        "filename": "04_Freelance_Design_Graphique.pdf",
        "company": "Studio Creatif - Yassine Bouaziz",
        "company_addr": "Residence El Manar, Bloc B, Apt 12\n2092 Ariana",
        "company_mf": "1234567/R/P/N/000",
        "client": "Tac-Tic SARL",
        "client_addr": "Zone Industrielle Charguia\n2035 Tunis",
        "client_id": "",
        "inv_no": "YB-2024-042",
        "items": [("Conception logo et charte graphique", 1, 1500.000), ("Design site web (5 pages)", 1, 3000.000), ("Adaptation supports print", 1, 800.000)],
        "tva_rate": 19, "lang": "fr", "date_style": "fr", "color": (148, 0, 211),
    },
    # 5. IT Services (English)
    {
        "filename": "05_IT_Services_Cloud_EN.pdf",
        "company": "TechCloud Solutions Ltd",
        "company_addr": "Silicon Park, Bloc 7\nTechnopole El Ghazala, 2088 Ariana",
        "company_mf": "9876543/A/A/M/000",
        "client": "Tac-Tic SARL",
        "client_addr": "Charguia Industrial Zone, Tunis",
        "client_id": "CUST-TAC-001",
        "inv_no": "INV-2024-TC-0891",
        "items": [("Cloud Hosting - Annual Plan (AWS)", 1, 8500.000), ("SSL Certificate - Wildcard", 2, 250.000), ("Maintenance & Support (12 months)", 1, 3600.000), ("Domain Renewal (.tn + .com)", 2, 45.000)],
        "tva_rate": 19, "lang": "en", "date_style": "iso", "color": (0, 53, 95),
    },
    # 6. Restaurant Supplier
    {
        "filename": "06_Fournisseur_Restaurant.pdf",
        "company": "Les Delices du Sahel - Grossiste Alimentaire",
        "company_addr": "Route de Monastir, KM 5\n4000 Sousse",
        "company_mf": "4567890/D/A/M/000",
        "client": "Restaurant Le Palmier",
        "client_addr": "12, Avenue de la Liberte\n4011 Hammam Sousse",
        "client_id": "",
        "inv_no": "DS-2024-1247",
        "items": [("Huile d'olive extra vierge 5L x10", 10, 45.000), ("Harissa artisanale 370g x24", 24, 4.500), ("Couscous fin 1kg x50", 50, 3.200), ("Thon a l'huile 160g x48", 48, 2.800)],
        "tva_rate": 7, "lang": "fr", "date_style": "fr", "color": (139, 69, 19),
    },
    # 7. Medical Clinic
    {
        "filename": "07_Clinique_Medicale.pdf",
        "company": "Clinique Les Jasmins",
        "company_addr": "Avenue 14 Janvier, 1002 Tunis",
        "company_mf": "3456789/C/A/M/000",
        "client": "Fatma Gharbi",
        "client_addr": "45, Rue de Marseille\n1000 Tunis",
        "client_id": "PAT-2024-3892",
        "inv_no": "CLJ-2024-00291",
        "items": [("Consultation specialiste", 1, 80.000), ("Analyses sanguines (bilan complet)", 1, 120.000), ("Echographie abdominale", 1, 95.000)],
        "tva_rate": 7, "lang": "fr", "date_style": "fr", "color": (0, 128, 128),
    },
    # 8. Construction Materials
    {
        "filename": "08_Materiaux_Construction.pdf",
        "company": "SOTUMA - Materiaux de Construction",
        "company_addr": "Zone Industrielle Megrine\n2033 Ben Arous",
        "company_mf": "6789012/I/A/M/000",
        "client": "Entreprise BTP Kamel & Fils",
        "client_addr": "Route de Bizerte, KM 12\n7000 Bizerte",
        "client_id": "CLI-BTP-0049",
        "inv_no": "STM-2024-04821",
        "items": [("Ciment Portland CEM II 42.5 (tonne)", 5, 280.000), ("Sable lave 0/4 (m3)", 10, 45.000), ("Fer a beton HA 12mm (tonne)", 2, 2100.000), ("Briques 12 trous (palette 500)", 3, 350.000)],
        "tva_rate": 19, "lang": "fr", "date_style": "fr", "color": (128, 128, 0),
    },
    # 9. Consulting (Bilingual)
    {
        "filename": "09_Cabinet_Conseil_Bilingue.pdf",
        "company": "Grant Thornton Tunisie",
        "company_addr": "Immeuble Iris, Les Berges du Lac\n1053 Tunis",
        "company_mf": "2345678/G/A/M/000",
        "client": "Tac-Tic SARL",
        "client_addr": "Charguia, Tunis",
        "client_id": "MIS-2024-TAC",
        "inv_no": "GT-TN-2024-0178",
        "items": [("Audit financier annuel / Annual Financial Audit", 1, 15000.000), ("Conseil fiscal T3 / Tax Advisory Q3", 1, 5000.000), ("Due diligence acquisition / Acquisition Due Diligence", 1, 8000.000)],
        "tva_rate": 19, "lang": "fr", "date_style": "fr", "color": (100, 0, 100),
    },
    # 10. Car Rental
    {
        "filename": "10_Location_Voiture.pdf",
        "company": "Hertz Tunisie",
        "company_addr": "Aeroport Tunis-Carthage\n1080 Tunis",
        "company_mf": "7890123/H/A/M/000",
        "client": "Sami Mrad",
        "client_addr": "Cite Olympique, 1003 Tunis",
        "client_id": "LOC-2024-SM-089",
        "inv_no": "HZ-TN-2024-10892",
        "items": [("Location Hyundai Tucson - 5 jours", 5, 120.000), ("Assurance tous risques", 5, 25.000), ("GPS Navigation", 5, 10.000), ("Plein carburant", 1, 85.000)],
        "tva_rate": 19, "lang": "fr", "date_style": "fr", "color": (255, 204, 0),
    },
    # 11. Pharmacy Wholesale
    {
        "filename": "11_Grossiste_Pharmacie.pdf",
        "company": "SIPHAT - Societe des Industries Pharmaceutiques",
        "company_addr": "Route de Fouchana, 2013 Ben Arous",
        "company_mf": "0011223/S/A/M/000",
        "client": "Pharmacie Centrale Sousse",
        "client_addr": "Avenue Habib Bourguiba\n4000 Sousse",
        "client_id": "PH-SOU-0342",
        "inv_no": "SPH-2024-89012",
        "items": [("Paracetamol 500mg x100 boites", 100, 2.200), ("Amoxicilline 1g x50 boites", 50, 8.500), ("Omeprazole 20mg x80 boites", 80, 5.800)],
        "tva_rate": 7, "lang": "fr", "date_style": "fr", "color": (0, 153, 76),
    },
    # 12. Training Center
    {
        "filename": "12_Centre_Formation.pdf",
        "company": "ISET - Institut Superieur des Etudes Technologiques",
        "company_addr": "Campus Universitaire, 5000 Monastir",
        "company_mf": "3344556/E/A/P/000",
        "client": "Tac-Tic SARL",
        "client_addr": "Charguia, Tunis",
        "client_id": "",
        "inv_no": "FORM-2024-0089",
        "items": [("Formation Python avancee (5 jours x 3 pers.)", 3, 1200.000), ("Formation Cybersecurite (3 jours x 2 pers.)", 2, 1500.000), ("Supports pedagogiques", 1, 250.000)],
        "tva_rate": 7, "lang": "fr", "date_style": "fr", "color": (0, 0, 139),
    },
    # 13. Import/Export (English)
    {
        "filename": "13_Import_Export_EN.pdf",
        "company": "Mediterranean Trade Co.",
        "company_addr": "Port de Rades, Zone Franche\n2040 Rades, Tunisia",
        "company_mf": "5566778/T/A/M/000",
        "client": "Tac-Tic SARL",
        "client_addr": "Charguia Industrial Zone, Tunis",
        "client_id": "IMP-TAC-2024",
        "inv_no": "MTC-EXP-2024-0451",
        "items": [("Electronic Components - Batch #4521", 1, 12500.000), ("Shipping & Handling (CIF Tunis)", 1, 1800.000), ("Customs Clearance Fee", 1, 450.000), ("Insurance (marine cargo)", 1, 375.000)],
        "tva_rate": 19, "lang": "en", "date_style": "iso", "color": (0, 80, 120),
    },
    # 14. Insurance
    {
        "filename": "14_Assurance_STAR.pdf",
        "company": "STAR - Societe Tunisienne d'Assurance et de Reassurance",
        "company_addr": "Place Pasteur, 1002 Tunis",
        "company_mf": "0099887/A/A/M/000",
        "client": "Tac-Tic SARL",
        "client_addr": "Charguia, Tunis",
        "client_id": "POL-2024-TAC-112",
        "inv_no": "STAR-2024-PR-04521",
        "items": [("Assurance multirisque bureau - Annuelle", 1, 2800.000), ("Responsabilite civile professionnelle", 1, 1500.000), ("Assurance vehicule flotte (3 vehicules)", 3, 1200.000)],
        "tva_rate": 12, "lang": "fr", "date_style": "fr", "color": (180, 0, 0),
    },
    # 15. Printing Services
    {
        "filename": "15_Imprimerie.pdf",
        "company": "Imprimerie Officielle de la Republique Tunisienne",
        "company_addr": "Avenue Mohamed V, 1002 Tunis",
        "company_mf": "1122334/O/A/P/000",
        "client": "Tac-Tic SARL",
        "client_addr": "Charguia, Tunis",
        "client_id": "",
        "inv_no": "IORT-2024-2891",
        "items": [("Impression brochures A4 couleur x500", 500, 1.200), ("Cartes de visite premium x1000", 1000, 0.180), ("Affiches A1 grand format x20", 20, 12.000), ("Reliure et finition", 1, 150.000)],
        "tva_rate": 19, "lang": "fr", "date_style": "fr", "color": (50, 50, 50),
    },
    # 16. Software License (English)
    {
        "filename": "16_Software_License_EN.pdf",
        "company": "DataSoft International",
        "company_addr": "Technopark, Building C\nEl Ghazala, 2088 Ariana",
        "company_mf": "6677889/D/A/M/000",
        "client": "Tac-Tic SARL",
        "client_addr": "Charguia, Tunis, Tunisia",
        "client_id": "LIC-TAC-2024",
        "inv_no": "DS-LIC-2024-0067",
        "items": [("ERP License - 10 users (annual)", 1, 18000.000), ("Database Module Add-on", 1, 4500.000), ("Technical Support Premium (12mo)", 1, 6000.000), ("On-site Training (2 days)", 1, 3000.000)],
        "tva_rate": 19, "lang": "en", "date_style": "iso", "color": (0, 53, 95),
    },
    # 17. Transport & Logistics
    {
        "filename": "17_Transport_Logistique.pdf",
        "company": "CTN - Compagnie Tunisienne de Navigation",
        "company_addr": "5, Rue Dag Hammarskjold\n1002 Tunis",
        "company_mf": "2233445/N/A/M/000",
        "client": "Tac-Tic SARL",
        "client_addr": "Charguia, Tunis",
        "client_id": "FRT-TAC-2024",
        "inv_no": "CTN-2024-FRT-8920",
        "items": [("Fret maritime container 20' (Tunis-Marseille)", 1, 4200.000), ("Surcharge carburant (BAF)", 1, 630.000), ("Frais de documentation", 1, 150.000), ("Manutention portuaire", 1, 380.000)],
        "tva_rate": 19, "lang": "fr", "date_style": "fr", "color": (0, 51, 102),
    },
    # 18. Office Supplies
    {
        "filename": "18_Fournitures_Bureau.pdf",
        "company": "Valoorem Tunisie",
        "company_addr": "Route de Sousse, KM 3\n4000 Sousse",
        "company_mf": "8899001/V/A/M/000",
        "client": "Tac-Tic SARL",
        "client_addr": "Charguia, Tunis",
        "client_id": "CLI-0891",
        "inv_no": "VAL-2024-BL-4521",
        "items": [("Papier A4 80g (carton 5 ramettes) x10", 10, 32.000), ("Toner HP LaserJet Pro x4", 4, 89.000), ("Classeurs A4 x20", 20, 4.500), ("Post-it notes assorties x30", 30, 2.100), ("Stylos BIC cristal x100", 100, 0.450)],
        "tva_rate": 19, "lang": "fr", "date_style": "fr", "color": (0, 128, 0),
    },
    # 19. Security Services
    {
        "filename": "19_Societe_Gardiennage.pdf",
        "company": "Securitas Tunisie",
        "company_addr": "Immeuble Securitas, Les Berges du Lac\n1053 Tunis",
        "company_mf": "5544332/S/A/M/000",
        "client": "Tac-Tic SARL",
        "client_addr": "Zone Industrielle Charguia, Tunis",
        "client_id": "CTR-TAC-2024-007",
        "inv_no": "SEC-2024-MEN-1102",
        "items": [("Gardiennage 24h/7j - Octobre 2024 (2 agents)", 2, 2200.000), ("Ronde de nuit supplementaire x8", 8, 75.000), ("Maintenance systeme alarme", 1, 350.000)],
        "tva_rate": 19, "lang": "fr", "date_style": "fr", "color": (25, 25, 112),
    },
    # 20. International Consulting (English)
    {
        "filename": "20_International_Consulting_EN.pdf",
        "company": "McKinsey & Company - Tunis Office",
        "company_addr": "Rue du Lac Windermere\nLes Berges du Lac, 1053 Tunis",
        "company_mf": "9988776/M/A/M/000",
        "client": "Tac-Tic SARL",
        "client_addr": "Charguia Industrial Zone\nTunis, Tunisia",
        "client_id": "ENG-TAC-2024",
        "inv_no": "MCK-TN-2024-0034",
        "items": [("Strategic Transformation Advisory (Phase 1)", 1, 45000.000), ("Market Analysis Report - MENA Region", 1, 18000.000), ("Change Management Workshop (3 days)", 1, 12000.000), ("Travel & Expenses", 1, 3500.000)],
        "tva_rate": 19, "lang": "en", "date_style": "iso", "color": (0, 39, 76),
    },
]


def generate_invoice(data):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=20)

    r, g, b = data["color"]
    issue_date = rand_date()
    due_date = issue_date + timedelta(days=random.choice([15, 30, 45, 60]))
    is_en = data["lang"] == "en"

    # ── Header bar ──
    pdf.set_fill_color(r, g, b)
    pdf.rect(0, 0, 210, 8, "F")

    # ── Company info ──
    pdf.set_y(15)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(r, g, b)
    pdf.cell(0, 8, data["company"], ln=True)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(80, 80, 80)
    for line in data["company_addr"].split("\n"):
        pdf.cell(0, 4, line, ln=True)
    if data["company_mf"]:
        pdf.cell(0, 4, f"{'Tax ID' if is_en else 'MF'}: {data['company_mf']}", ln=True)

    # ── Invoice title ──
    pdf.set_y(15)
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(r, g, b)
    title = "INVOICE" if is_en else "FACTURE"
    pdf.cell(0, 10, title, align="R", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(80, 80, 80)
    no_label = "Invoice No." if is_en else "Facture N\xb0"
    pdf.cell(0, 5, f"{no_label}: {data['inv_no']}", align="R", ln=True)
    date_label = "Date" if is_en else "Date d'\xe9mission"
    pdf.cell(0, 5, f"{date_label}: {fmt_date(issue_date, data['date_style'])}", align="R", ln=True)
    due_label = "Due Date" if is_en else "Date limite de paiement"
    pdf.cell(0, 5, f"{due_label}: {fmt_date(due_date, data['date_style'])}", align="R", ln=True)

    # ── Divider ──
    pdf.set_y(pdf.get_y() + 5)
    pdf.set_draw_color(r, g, b)
    pdf.set_line_width(0.5)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())

    # ── Client info ──
    pdf.set_y(pdf.get_y() + 5)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(80, 80, 80)
    client_label = "Bill To" if is_en else "Factur\xe9 \xe0"
    pdf.cell(0, 5, client_label, ln=True)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 6, data["client"], ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(80, 80, 80)
    for line in data["client_addr"].split("\n"):
        pdf.cell(0, 4, line, ln=True)
    if data["client_id"]:
        id_label = "Client ID" if is_en else "N\xb0 client"
        pdf.cell(0, 4, f"{id_label}: {data['client_id']}", ln=True)

    # ── Items table ──
    pdf.set_y(pdf.get_y() + 8)
    # Header
    pdf.set_fill_color(r, g, b)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 8)
    desc_h = "Description"
    qty_h = "Qty" if is_en else "Qte"
    price_h = "Unit Price" if is_en else "Prix Unit."
    total_h = "Total (TND)"
    pdf.cell(95, 7, f"  {desc_h}", fill=True)
    pdf.cell(20, 7, qty_h, fill=True, align="C")
    pdf.cell(35, 7, price_h, fill=True, align="R")
    pdf.cell(40, 7, total_h, fill=True, align="R")
    pdf.ln()

    # Rows
    pdf.set_text_color(30, 30, 30)
    total_ht = 0
    for i, (desc, qty, price) in enumerate(data["items"]):
        line_total = qty * price
        total_ht += line_total
        if i % 2 == 0:
            pdf.set_fill_color(245, 247, 250)
        else:
            pdf.set_fill_color(255, 255, 255)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(95, 7, f"  {desc}", fill=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(20, 7, str(qty), fill=True, align="C")
        pdf.cell(35, 7, fmt_num(price), fill=True, align="R")
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(40, 7, fmt_num(line_total), fill=True, align="R")
        pdf.ln()

    # ── Totals ──
    tva_amount = round(total_ht * data["tva_rate"] / 100, 3)
    total_ttc = round(total_ht + tva_amount, 3)

    pdf.set_y(pdf.get_y() + 3)
    x_start = 120

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(80, 80, 80)
    ht_label = "Subtotal (excl. tax)" if is_en else "Total Hors Taxes"
    pdf.set_x(x_start)
    pdf.cell(40, 6, ht_label)
    pdf.cell(40, 6, f"{fmt_num(total_ht)} TND", align="R", ln=True)

    tva_label = f"{'VAT' if is_en else 'TVA'} {data['tva_rate']}%"
    pdf.set_x(x_start)
    pdf.cell(40, 6, tva_label)
    pdf.cell(40, 6, f"{fmt_num(tva_amount)} TND", align="R", ln=True)

    # TTC line
    pdf.set_draw_color(r, g, b)
    pdf.set_line_width(0.3)
    pdf.line(x_start, pdf.get_y(), 200, pdf.get_y())
    pdf.set_y(pdf.get_y() + 1)

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(r, g, b)
    ttc_label = "Total Amount Due" if is_en else "Montant TTC"
    pdf.set_x(x_start)
    pdf.cell(40, 8, ttc_label)
    pdf.cell(40, 8, f"{fmt_num(total_ttc)} TND", align="R", ln=True)

    # ── Payment box ──
    pdf.set_y(pdf.get_y() + 8)
    pdf.set_fill_color(r, g, b)
    pdf.set_draw_color(r, g, b)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 9)
    pay_label = "Amount to Pay" if is_en else "Montant \xe0 Payer"
    pdf.cell(95, 8, f"  {pay_label}: {fmt_num(total_ttc)} TND", fill=True)
    pdf.set_font("Helvetica", "", 9)
    due_box = f"  {due_label}: {fmt_date(due_date, data['date_style'])}"
    pdf.cell(95, 8, due_box, fill=True, ln=True)

    # ── Footer ──
    pdf.set_y(pdf.get_y() + 15)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(150, 150, 150)
    if is_en:
        pdf.cell(0, 4, "This invoice is computer-generated and is valid without signature.", align="C", ln=True)
        pdf.cell(0, 4, "Payment terms: Net 30 days. Late payment penalty: 1.5% per month.", align="C", ln=True)
    else:
        pdf.cell(0, 4, "Cette facture est g\xe9n\xe9r\xe9e automatiquement et tient lieu de document comptable.", align="C", ln=True)
        pdf.cell(0, 4, "Conditions de paiement: 30 jours nets. P\xe9nalit\xe9 de retard: 1.5% par mois.", align="C", ln=True)

    # ── Bottom bar ──
    pdf.set_fill_color(r, g, b)
    pdf.rect(0, 289, 210, 8, "F")

    # Save
    filepath = os.path.join(OUT_DIR, data["filename"])
    pdf.output(filepath)
    return filepath, total_ht, tva_amount, total_ttc


# ── Generate all 20 ──
if __name__ == "__main__":
    print("=" * 60)
    print("  GENERATING 20 REALISTIC INVOICES")
    print("=" * 60)
    for i, inv in enumerate(invoices):
        path, ht, tva, ttc = generate_invoice(inv)
        lang_flag = "EN" if inv["lang"] == "en" else "FR"
        print(f"  [{i+1:2d}/20] {inv['filename']:45s} {lang_flag}  HT:{ht:>12,.3f}  TVA{inv['tva_rate']:>2d}%:{tva:>10,.3f}  TTC:{ttc:>12,.3f}")
    print("=" * 60)
    print(f"  Output: {OUT_DIR}")
    print(f"  Total: {len(invoices)} invoices generated")
    print("=" * 60)
