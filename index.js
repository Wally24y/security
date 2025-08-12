
function showStatus(message, type = "success") {
  const statusEl = document.getElementById("statusMessage");
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = "block";
    setTimeout(() => {
      statusEl.style.display = "none";
    }, 1000);
  }
}
const adminBtn=document.getElementById('admin1');
if (adminBtn){
    adminBtn.addEventListener('click', function() {
    window.location.href = "admin_panel.html"; 
});
}
const enterBtn = document.getElementById('enter');
if (enterBtn) {
    enterBtn.addEventListener('click', function (e) {
      e.preventDefault(); // prevent accidental form submit if button is inside a form
      const adminName = document.getElementById('admin_name').value.trim();
      const password = document.getElementById('password').value.trim();
        // your required values
      const correctAdminName = "admin";
      const correctPassword = "123";
      const isNameCorrect = adminName === correctAdminName;
      const isPasswordCorrect = password === correctPassword;
      if (!isNameCorrect && !isPasswordCorrect) {
        alert("❌ Incorrect admin name and password!");
        return;
      } else if (!isNameCorrect) {
        alert("❌ Incorrect admin name!");
        return;
      } else if (!isPasswordCorrect) {
        alert("❌ Incorrect password!");
        return;
      }
        //  both matched
        window.location.href = "admin_page.html";
    });
}
const homeBtn=document.getElementById('homeBtn');
if(homeBtn){
    homeBtn.addEventListener('click', function() {
        //hideDatabaseTable(); // clear table if visible
        window.location.href = "index.html"; // redirect to index.html
    });
}
const backupDb=document.getElementById('backupDb');
if(backupDb){
    backupDb.addEventListener('click',async function() {
      hideExportPanel();
      hideDatabaseTable();
      const msg= await window.pywebview.api.backup_database();
      alert(msg);
  });
}
function hideDatabaseTable() {
    const container = document.getElementById('dataTable');
    container.innerHTML = '';        // clears the table content
    databaseVisible = false;         // reset state
    offset = 0;                       // reset pagination offset
    hasMore = true;
    scrollHandlerBound = false;
    if (scrollHandlerBound) {        // remove scroll handler too
        window.removeEventListener('scroll', scrollHandler);
        scrollHandlerBound = false;
    }
}
function hideExportPanel() {
  const panel = document.getElementById('exportPanel');
  if (panel && panel.style.display === 'block') {
    panel.style.display = 'none';
  }
}
// --- Pagination state ---
let offset = 0;
const limit = 50;
let loading = false;
let databaseVisible = false;
let hasMore = true;          // indicates if there are more rows to fetch
let scrollHandlerBound = false; // track if scroll handler has been attached

async function loadVisitors() {
  if (loading || !hasMore) return;
  loading = true;
  const rows = await window.pywebview.api.get_visitors_paginated(offset, limit);
  if (rows.length > 0) {
      const container = document.getElementById('dataTable');
        // If first load, add table header
      if (offset === 0) {
          container.innerHTML = `
                <table border="0.5" id="visitors-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Date</th>
                            <th>Name</th>
                            <th>Company</th>
                            <th>Phone</th>
                            <th>Going To</th>
                            <th>ID Type</th>
                            <th>TAA ID NO</th>
                            <th>Time In</th>
                            <th>Time Out</th>
                            <th>AVSEC NAME</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            `;
      }

      const tbody = document.querySelector('#visitors-table tbody');
      rows.forEach(row => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
                <td>${row[0]}</td>
                <td>${row[1]}</td>
                <td>${row[2]}</td>
                <td>${row[3]}</td>
                <td>${row[4]}</td>
                <td>${row[5]}</td>
                <td>${row[6]}</td>
                <td>${row[7]}</td>
                <td>${row[8]}</td>
                <td>${row[9]}</td>
                <td>${row[10]}</td>
            `;
            tbody.appendChild(tr);
      });
      offset += rows.length;
    }
       // If fewer rows than limit returned, no more data
    if (rows.length < limit) {
        hasMore = false;
        removeScrollHandler();
    } else {
            // Ensure scroll handler is set
        if (!scrollHandlerBound) {
            window.addEventListener('scroll', scrollHandler);
            scrollHandlerBound = true;
        }
      } 
    loading = false;
  } 
// Infinite scroll handler
function scrollHandler() {
    if (!hasMore || loading) return;
    // Check if near bottom
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        loadVisitors();
    }
}
// Helper to remove scroll handler
function removeScrollHandler() {
    if (scrollHandlerBound) {
        window.removeEventListener('scroll', scrollHandler);
        scrollHandlerBound = false;
    }   
}
// when Database button is clicked
const showBtn = document.getElementById('showBtn');
if (showBtn) {
    showBtn.addEventListener('click', function() {
        hideExportPanel();
        if (!databaseVisible) {
            databaseVisible = true;
            offset = 0;
            document.getElementById('dataTable').innerHTML = '';
            loadVisitors();
        }
    });
}
  // Open/close export panel
  const openExportPanel =document.getElementById('openExportPanel');
  if(openExportPanel){
    openExportPanel.addEventListener('click', function() {
    hideDatabaseTable();
    const panel = document.getElementById('exportPanel'); 
    panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
  });
    }
  // Filter logic
async function getFilteredData() {
    const fromDate = document.getElementById('filterFromDate').value;
    const toDate = document.getElementById('filterDate').value;
    const selectedDestination = document.getElementById('filterDestination').value;
    const results = await window.pywebview.api.get_filtered_visitors(fromDate, toDate, selectedDestination);
    return results;  // backend returns already filtered data
  }
  // PDF export
const exportPdf = document.getElementById('exportPdf');
if (exportPdf) {
  exportPdf.addEventListener('click', async function() {
    const { jsPDF } = window.jspdf;
    // 1. Ask backend for save location
    const savePath = await window.pywebview.api.choose_save_location("visitors.pdf", ["PDF files (*.pdf)"]);
    if (!savePath) {
      alert("⚠️ Export canceled.");
      return;
    }
    // 2. Get filtered data
    const filtered = await getFilteredData();
    if (filtered.length === 0) {
      alert("⚠️ No data to export.");
      return;
    }
    // 3. Generate PDF
    const doc = new jsPDF();
    doc.text("TAA Security Check-in Visitors Data", 10, 10);

    const headers = [["ID", "Date", "Name", "Company", "Phone", "Going To", "ID Type", "TAA ID No","Time In", "Time Out", "AVSEC NAME"]];
    const rows = filtered.map(entry => [
      entry.id,
      entry.date,
      entry.visitors_name,
      entry.company,
      entry.phone_no,
      entry.going_to,
      entry.id_type,
      entry.id_no,
      entry.time_in,
      entry.time_out,
      entry.avsec_name
    ]);
    // Create autoTable
    doc.autoTable({
      startY: 20,
      head: headers,
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [22, 160, 133] }
    });
    // 4. Save to chosen path
    // ⚠️ 
    const pdfBlob = doc.output('blob');
    const reader = new FileReader();
    reader.onload = async function () {
    const base64Data = reader.result.split(',')[1];
    try {
      const result = await window.pywebview.api.write_file(savePath, base64Data, "pdf");
      alert(result);
    } catch (err) {
      console.error("❌ Error writing file:", err);
      alert("❌ Failed to save PDF. Details: " + err.message);
    }
};
    reader.readAsDataURL(pdfBlob);
  });
}
  // Excel export
const exportExcel = document.getElementById('exportExcel');
if (exportExcel) {  
   exportExcel.addEventListener('click', async function() {
    // 1. Ask backend for save location
    const savePath = await window.pywebview.api.choose_save_location("visitors.xlsx", ["Excel files (*.xlsx)"]);
    if (!savePath) {
      alert("⚠️ Export canceled.");
      return;
    }
    const filtered = await getFilteredData();
    const rows = filtered.map(entry => ({
      Date: entry.date,
      Name: entry.visitors_name,
      Company: entry.company,
      Phone: entry.phone_no,
      GoingTo: entry.going_to,
      IDType: entry.id_type,
      IDNo: entry.id_no,
      TimeIn: entry.time_in,
      TimeOut: entry.time_out,
      AVSEC: entry.avsec_name
    }));
    // Generate Excel in browser
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Visitors");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    // Convert to base64 and send to backend to save
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const reader = new FileReader();
    reader.onload = async function() {
      const base64Data = reader.result.split(',')[1];
      await window.pywebview.api.write_file(savePath, base64Data, "excel");
      alert("✅ Excel saved!");
    };
    reader.readAsDataURL(blob);
  });
}
const visitorForm = document.getElementById('visitorform'); // or visitorForm
if (visitorForm) {
    visitorForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const visitorData = {
      id: document.getElementById('visitor_id').value.trim(),
      date: document.getElementById('date').value.trim(),
      visitors_name: document.getElementById('visitors_name').value.trim(),
      company: document.getElementById('company').value.trim(),
      phone_no: document.getElementById('phone_no').value.trim(),
      going_to: document.getElementById('going_to').value.trim(),
      id_type: document.getElementById('id_type').value.trim(),
      id_no: document.getElementById('id_no').value.trim(),
      time_in: document.getElementById('time_in').value.trim(),
      time_out: document.getElementById('time_out').value.trim(),
      avsec_name: document.getElementById('avsec_name').value.trim()
    };

    const isUpdate = visitorData.id !== '';
    if (!isUpdate) {
    const requiredFields = ['visitors_name', 'company', 'phone_no', 'going_to', 'id_type', 'id_no', 'time_in', 'avsec_name'];
    const allFilled = requiredFields.every(id => {
      const el = document.getElementById(id);
      return el && el.value.trim() !== '';
    });

    if (!allFilled) {
      alert("❌ Please fill in all required fields!");
      return;
    }
  } else {
    if (!visitorData.time_out) {
      alert("❌ Please enter check-out time!");
      return;
    }
  }
    try {
      await window.pywebview.api.submit_visitor(visitorData);
      const message = isUpdate
        ? "✅ Update successful!"  
        : "✅ Registration successful!";
      showStatus(message, "success");
      //if (!isUpdate) visitorForm.reset(); ⚠️
    setTimeout(() => {
    visitorForm.reset();
    setFieldValue('visitor_id', '');
    restoreAvsecName();
    //validateForm();
}, 1000); 
      //validateForm();
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to save visitor data.");
    }
  });
}
function restoreAvsecName() {
  const avsecName = localStorage.getItem("avsec_name");
  if (avsecName) {
    setFieldValue("avsec_name", avsecName);
  }
}
function setFieldValue(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.value = value;
    el.classList.add('autofill-highlight');
    setTimeout(() => el.classList.remove('autofill-highlight'), 1000);
  }
}
const clearBtn=document.getElementById('clearBtn');
if(clearBtn){
    clearBtn.addEventListener('click', function () {
      visitorForm.reset();
      const fields = [
        'visitor_id', 'date', 'visitors_name', 'company',
        'phone_no', 'going_to', 'id_type', 'id_no','time_in',
        'time_out', 'avsec_name'
      ];
      fields.forEach(id => setFieldValue(id, ''));
      const avsecName = localStorage.getItem("avsec_name");
      if (avsecName) {
        setFieldValue("avsec_name", avsecName);
      }
    });
}
const fetchBtn=document.getElementById('fetchBtn');
  if(fetchBtn){
    fetchBtn.addEventListener('click', async function () {
    const name = document.getElementById('visitors_name').value.trim();
    const phone = document.getElementById('phone_no').value.trim();
    const idNo = document.getElementById('id_no').value.trim();
    if (!name && !phone && !idNo) {
      alert("Enter visitor's name or phone no. or TAA ID no.");
      return;
    }
    const keysToTry = [name, phone, idNo];
    let visitor = null;

    for (const key of keysToTry) {
      if (key) {
        visitor = await window.pywebview.api.get_visitor_pending_checkout(key);
        if (visitor) break; // stop if found
      }
    }
    if (!visitor) {
      alert("⚠️ No record found for that visitor.");
      return;
    }
    setFieldValue('visitor_id', visitor.id);
    setFieldValue('visitors_name', visitor.visitors_name);
    setFieldValue('date', visitor.date);
    setFieldValue('company', visitor.company);
    setFieldValue('phone_no', visitor.phone_no);
    setFieldValue('going_to', visitor.going_to);
    setFieldValue('id_type', visitor.id_type);
    setFieldValue('id_no', visitor.id_no);
    setFieldValue('time_in', visitor.time_in);
    setFieldValue('avsec_name', visitor.avsec_name);
    setFieldValue('time_out', ''); // Leave blank for manual update
    validateForm(); // make sure submit button state is updated
  });
    const avsecName = localStorage.getItem("avsec_name");
  if (avsecName) {
    setFieldValue("avsec_name", avsecName);
  }
}
(async () => {
  const avsecField = document.getElementById("avsec_name");
  if (avsecField) {
    const storedName = localStorage.getItem("avsec_name");   
     if (storedName) {
        avsecField.value = storedName;
        avsecField.readOnly = true;
      }
  }
})();
const usernameInput = document.getElementById("username1");
const passwordInput = document.getElementById("password1");
const checkinBtn = document.getElementById("checkinBtn");
const adminBtn1 = document.getElementById("adminBtn1");
if (checkinBtn) {
    checkinBtn.addEventListener("click", async () => {
      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();

      const result = await window.pywebview.api.authenticate_user(username, password);
      if (result.status === "success" && result.role === "checkin") {
        localStorage.setItem("avsec_name", result.display_name);  // ✅ Save to localStorage
        window.location.href = "index.html";
      } else {
        alert(result.message || "Invalid check-in credentials");
      }
    });
  }

if (adminBtn1) {
    adminBtn1.addEventListener("click", async () => {
      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();

      const result = await window.pywebview.api.authenticate_user(username, password);
      if (result.status === "success" && result.role === "admin") {
        window.location.href = "admin_page.html";
      } else {
        alert(result.message || "Invalid admin credentials");
      }
    });
  }