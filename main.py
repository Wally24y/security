import sqlite3
import os, sys               #help if file path is needed
import webview
import shutil
import base64
from datetime import datetime
import tkinter as tk
from tkinter import filedialog
import re


Database1="visitors.db"        #our database name.

#initialize database if does not exist.
def init_db():
    data=sqlite3.connect(Database1)
    action1=data.cursor() #creates a cursor to run SQL commands
    action1.execute('''
        CREATE TABLE IF NOT EXISTS visitors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT NOT NULL,
                    visitors_name TEXT NOT NULL,
                    company TEXT NOT NULL,
                    phone_no TEXT NOT NULL,
                    going_to TEXT NOT NULL,
                    id_type TEXT NOT NULL,
                    id_no TEXT NOT NULL,
                    time_in TEXT NOT NULL,
                    time_out TEXT DEFAULT '',
                    avsec_name TEXT NOT NULL
                    )
                    ''')
    data.commit()
    data.close()
#created_at TEXT DEFAULT (DATE('now','localtime'))
#function to insert data
USERS = {
    "officer1": {"password": "pass123", "role": "checkin","display_name": "John Mlay"},
    "officer2": {"password": "secret456", "role": "checkin","display_name": "Anna Mdee"},
    "admin1":   {"password": "adminpass", "role": "admin"}
}
current_user = {"username": None, "role": None}
def save_visitor(date,visitors_name,company,phone_no,going_to,id_type,id_no,time_in,time_out,avsec_name):
    try:
        data = sqlite3.connect(Database1)
        action1 = data.cursor()
        action1.execute(
            'INSERT INTO visitors (date,visitors_name,company,phone_no,going_to,id_type,id_no,time_in,time_out,avsec_name) VALUES (?,?,?,?,?,?,?,?,?,?)',
            (date, visitors_name, company, phone_no, going_to, id_type, id_no, time_in, time_out, avsec_name))
        data.commit()
        data.close()
        return True
    except Exception as e:
        print("DB insert error:", e)
        return False
def get_filtered_visitors(from_date=None, to_date=None, destination=None):
    conn = sqlite3.connect(Database1)
    cursor = conn.cursor()
    # Start building the query
    query =  """SELECT id, date, visitors_name, company, phone_no, going_to, id_type, id_no, time_in, time_out, avsec_name FROM visitors WHERE 1=1"""
    params = []
    if from_date:
        query += " AND date >= ?"
        params.append(from_date)
    if to_date:
        query += " AND date <= ?"
        params.append(to_date)
    if destination and destination != 'all':
        query += " AND going_to = ?"
        params.append(destination)
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    # Convert rows to dicts (if needed)
    columns = ["id","date","visitors_name","company","phone_no","going_to","id_type","id_no","time_in","time_out","avsec_name"]  # match your table structure
    visitors = [dict(zip(columns, row)) for row in rows]
    return visitors

def resource_path(relative_path):
    """Get absolute path to resource (works for dev and PyInstaller)"""
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)

index_path = resource_path("images/FRONT.jpg")
admin_page_path = resource_path("images/Full_view.jpg")
admin_panel_path =resource_path("images/TAA logo.jpg")

def get_visitor_pending_checkout(search_value):
    try:
        conn = sqlite3.connect(Database1)
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM visitors
            WHERE 
              (LOWER(visitors_name) LIKE ? OR id_no LIKE ? OR phone_no LIKE ?) 
              AND (time_out IS NULL OR time_out = '')
            ORDER BY id DESC LIMIT 1
        """, (f"%{search_value.lower()}%", f"%{search_value}%", f"%{search_value}%"))
        row = cur.fetchone()
        conn.close()
        if row:
            columns = ["id", "date", "visitors_name", "company", "phone_no", "going_to", "id_type", "id_no", "time_in", "time_out", "avsec_name"]
            return dict(zip(columns, row))
    except Exception as e:
            print("DB error:", e)
    return None
def update_time_out_by_id(visitor_id, time_out):
    if not visitor_id:
        return False
    try:
        conn = sqlite3.connect(Database1)
        cur = conn.cursor()
        cur.execute("UPDATE visitors SET time_out = ? WHERE id = ?", (time_out, visitor_id))
        conn.commit()
        updated = cur.rowcount
        conn.close()
        return updated > 0
    except Exception as e:
        print("DB error:", e)
        return False


#form submission function
class Api:
    def submit_visitor(self, data):
        visitor_id = data.get("id")
        date = data.get("date")
        visitors_name = data.get("visitors_name")
        company = data.get("company")
        phone_no = data.get("phone_no")
        going_to = data.get("going_to")
        id_type = data.get("id_type")
        id_no = data.get("id_no")
        time_in = data.get("time_in")
        time_out = data.get("time_out")
        avsec_name = data.get("avsec_name")

        if visitor_id is None or visitor_id == '':
        # New visitor - time_out may be None or empty
            if not all([date, visitors_name, company, phone_no, going_to, id_type, id_no, time_in, avsec_name]):
                return {"status": "error", "message": "Missing required fields"}

            success = save_visitor(date, visitors_name, company, phone_no, going_to, id_type, id_no, time_in, time_out, avsec_name)
            if success:
                return {"status": "success", "message": "Visitor registered successfully!"}
            else:
                return {"status": "error", "message": "Failed to save visitor."}

        else:
        # Update existing visitor's time_out (check-out)
            if not time_out:
                return {"status": "error", "message": "Missing check-out time."}
            updated = update_time_out_by_id(visitor_id, time_out)
            if updated:
                return {"status": "success", "message": "Visitor checked out successfully!"}
            else:
                return {"status": "error", "message": "Failed to check out visitor."}
    def get_visitors_paginated(self, offset=0, limit=10):
        first = sqlite3.connect(Database1)
        second = first.cursor()
        second.execute("SELECT * FROM visitors ORDER BY id DESC LIMIT ? OFFSET ?",(limit, offset))
        rows = second.fetchall()
        first.close()
        return rows  # pywebview will JSON-serialize this
    def backup_database(self):
        root = tk.Tk()
        root.withdraw()
        file_path = filedialog.asksaveasfilename(
            defaultextension=".db",
            initialfile=f"visitors_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db",
            filetypes=[("Database files", "*.db"), ("All files", "*.*")]
        )
        root.destroy()
        if not file_path:
            return "Backup cancelled."
        # Simulate backup by writing a dummy file (replace with real backup logic)
        try:
        # Perform real backup
            shutil.copy("visitors.db", file_path)
            return f"Backup saved to: {file_path}"
        except Exception as e:
            return f"Backup failed: {str(e)}"
    
    def get_filtered_visitors(self, from_date, to_date, destination):
        return get_filtered_visitors(from_date, to_date, destination)
    
    def write_file(self, filepath, base64_data, filetype):
        try:
            if not filepath:
                return "❌ No file path provided. Export canceled."

        # Decode base64 data
            file_bytes = base64.b64decode(base64_data)

        # Attempt to write the file
            try:
                with open(filepath, 'wb') as f:
                    f.write(file_bytes)
                return f"✅ {filetype.upper()} file saved successfully at:\n{filepath}"
            except (PermissionError, OSError):
            # File may be open — try saving to a new auto-named file
                new_path = self.get_next_available_filename(filepath)
                with open(new_path, 'wb') as f:
                    f.write(file_bytes)
                return f"⚠️ Original file in use. Saved as:\n{new_path}"

        except Exception as e:
            return f"❌ Unexpected error saving {filetype.upper()} file: {str(e)}"
        # Auto-generate new filename like visitors(1).pdf, visitors(2).pdf
    @staticmethod    
    def get_next_available_filename(path):
        base, ext = os.path.splitext(path)
        i = 1
        while True:
            new_path = f"{base}({i}){ext}"
            if not os.path.exists(new_path):
                return new_path
            i += 1
    def choose_save_location(self, default_filename, filetypes):
        root = tk.Tk()
        root.withdraw()  # Hide main window
        filetypes_cleaned = []
        for ft in filetypes:
            match = re.match(r"(.*?) \((.*?)\)", ft)
            if match:
                desc, pattern = match.groups()
                filetypes_cleaned.append((desc.strip(), pattern.strip()))
            else:
            # fallback if user passes tuple directly
                filetypes_cleaned.append(ft)
        file_path = filedialog.asksaveasfilename(
            defaultextension=os.path.splitext(default_filename)[1],
            initialfile=default_filename,
            filetypes=filetypes_cleaned)
        root.destroy()
        return file_path  # empty string if user cancels
    def get_visitor_pending_checkout(self, search_value):
        return get_visitor_pending_checkout(search_value)
    def update_time_out_by_id(self, visitor_id, time_out):
        return update_time_out_by_id(visitor_id, time_out)
    def authenticate_user(self, username, password):
        user = USERS.get(username)
        if user and user["password"] == password:
            current_user["username"] = username
            current_user["role"] = user["role"]
            return {"status": "success", "role": user["role"], "username": username,"display_name": user.get("display_name", username)}
        else:
            return {"status": "error", "message": "Invalid credentials."}

    def get_logged_in_user(self):
        return current_user["username"] if current_user["role"] == "checkin" else ""

if __name__== '__main__':
    init_db()
    api=Api()
    window=webview.create_window('TAA-Arusha Security Check-in','cover.html',js_api=api,min_size=(750, 650))
    webview.start()
