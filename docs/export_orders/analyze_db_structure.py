import os
import glob
import json
import csv
import re

# Настройки
CSV_DIR = r'docs\export_orders\coverted_new'
PDF_DIR = r'docs\export_orders\PDF'
OUTPUT_FILE = r'docs\export_orders\db_schema_analysis.json'

def get_csv_headers(csv_dir):
    tables = {}
    csv_files = glob.glob(os.path.join(csv_dir, '*.csv'))
    
    print(f"Analyzing {len(csv_files)} CSV files...")
    
    for file_path in csv_files:
        table_name = os.path.splitext(os.path.basename(file_path))[0]
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                headers = next(reader, [])
                tables[table_name] = {
                    'columns': headers,
                    'row_count': 0 # Could count rows but skip for speed
                }
        except Exception as e:
            print(f"Error reading CSV {file_path}: {e}")
            
    return tables

def extract_text_from_pdf(pdf_path):
    text_content = ""
    try:
        from pypdf import PdfReader
        reader = PdfReader(pdf_path)
        for page in reader.pages:
            text_content += page.extract_text() + "\n"
    except ImportError:
        print("ERROR: pypdf library is not installed. PDF analysis skipped.")
        return None
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
        return None
    return text_content

def analyze_pdfs(pdf_dir, tables):
    pdf_files = glob.glob(os.path.join(pdf_dir, '*.pdf'))
    pdf_data = {}
    
    if not pdf_files:
        print("No PDF files found.")
        return pdf_data

    print(f"Analyzing {len(pdf_files)} PDF files...")

    # Check for pypdf first
    try:
        import pypdf
    except ImportError:
        print("Please install pypdf to analyze PDF files: pip install pypdf")
        return pdf_data

    for file_path in pdf_files:
        filename = os.path.basename(file_path)
        table_name_guess = os.path.splitext(filename)[0] # Usually matches table name
        
        text = extract_text_from_pdf(file_path)
        if text:
            pdf_data[filename] = {
                'associated_table': table_name_guess if table_name_guess in tables else None,
                'content_snippet': text[:500], # First 500 chars for preview
                'full_content': text
            }
            
            # Simple heuristic extraction of field descriptions from text
            # Assuming lines like "FIELD_NAME - Description" or similar
            # This is very rough and depends on PDF layout
            if table_name_guess in tables:
                tables[table_name_guess]['doc_text'] = text

    return pdf_data

def infer_relationships(tables):
    relationships = []
    
    # Iterate over all tables and their columns
    for table_name, data in tables.items():
        columns = data.get('columns', [])
        
        for col in columns:
            # Check for standard FK naming conventions: TABLE_ID or ID_TABLE
            # 1. Ends with _ID
            if col.upper().endswith('_ID') and col.upper() != 'ID':
                target_table = col[:-3] # Remove _ID
                if target_table in tables:
                    relationships.append({
                        'from_table': table_name,
                        'from_column': col,
                        'to_table': target_table,
                        'to_column': 'ID' # Assumed PK
                    })
                # Check mapping tables sometimes used (e.g. TOVAR_ID -> TOVAR)
            
            # 2. Exact match with another table name (rare but possible)
            elif col in tables and col != table_name:
                 relationships.append({
                        'from_table': table_name,
                        'from_column': col,
                        'to_table': col,
                        'to_column': 'ID' # Assumed PK
                    })

    return relationships

def main():
    # 1. Get CSV Structs
    tables = get_csv_headers(CSV_DIR)
    
    # 2. Get PDF Info
    pdf_info = analyze_pdfs(PDF_DIR, tables)
    
    # 3. Infer Relationships
    relationships = infer_relationships(tables)
    
    # 4. Save detailed report
    full_report = {
        'tables': tables,
        'relationships': relationships,
        'pdf_summary': {k: {'associated_table': v['associated_table'], 'snippet': v['content_snippet']} for k, v in pdf_info.items()}
    }
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(full_report, f, indent=2, ensure_ascii=False)
        
    print(f"Analysis complete. Report saved to {OUTPUT_FILE}")
    print(f"Found {len(tables)} tables and {len(relationships)} potential relationships.")

if __name__ == "__main__":
    main()
