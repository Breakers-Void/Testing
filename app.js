const STORAGE_KEY = "govease_demo_requests_v1";
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

function loadRequests() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveRequests(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
function makeId() {
  return "GE-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}
function classify(text, selected) {
  const value = text.toLowerCase();
  if (value.match(/garbage|waste|trash|drain|clean|sanitation/)) return "Sanitation";
  if (value.match(/water|leak|pipe|supply/)) return "Water Supply";
  if (value.match(/electric|power|light|streetlight/)) return "Electricity";
  if (value.match(/road|pothole|footpath|bridge/)) return "Roads & Infrastructure";
  if (value.match(/health|clinic|hospital|mosquito/)) return "Public Health";
  return selected || "Other / Not sure";
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3000);
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
$$(".reveal").forEach(el => observer.observe(el));

const navLinks = $$(".nav-link");
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id));
    }
  });
}, { rootMargin: "-35% 0px -55% 0px" });
["home", "services", "submit", "track"].forEach(id => {
  const el = document.getElementById(id);
  if (el) sectionObserver.observe(el);
});

$("#menuToggle").addEventListener("click", () => $("#navLinks").classList.toggle("open"));
navLinks.forEach(link => link.addEventListener("click", () => $("#navLinks").classList.remove("open")));

$("#complaintForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  const request = {
    id: makeId(),
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    location: data.location.trim(),
    department: classify(data.description, data.department),
    description: data.description.trim(),
    status: "Under review",
    createdAt: new Date().toISOString()
  };
  const requests = loadRequests();
  requests.unshift(request);
  saveRequests(requests);
  $("#formMessage").textContent = `Your request was created. Reference ID: ${request.id}`;
  $("#formMessage").scrollIntoView({ behavior: "smooth", block: "nearest" });
  $("#trackId").value = request.id;
  form.reset();
  renderOfficerDashboard();
  showToast("Request submitted successfully!");
});

$("#trackForm").addEventListener("submit", event => {
  event.preventDefault();
  const id = $("#trackId").value.trim().toUpperCase();
  const request = loadRequests().find(item => item.id === id);
  const result = $("#trackResult");
  if (!request) {
    result.innerHTML = "We couldn't find that ID in this browser. Check the reference number and try again.";
    return;
  }
  const date = new Date(request.createdAt).toLocaleString();
  result.innerHTML = `<strong>${escapeHtml(request.status)}</strong> · ${escapeHtml(request.department)}<br>${escapeHtml(request.description)}<br><span style="color:#7182a5">Submitted ${escapeHtml(date)}</span>`;
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}

function renderOfficerDashboard() {
  const requests = loadRequests();
  $("#totalCount").textContent = requests.length;
  $("#reviewCount").textContent = requests.filter(item => item.status === "Under review").length;
  $("#resolvedCount").textContent = requests.filter(item => item.status === "Resolved").length;
  const rows = $("#officerRows");
  rows.innerHTML = "";
  if (!requests.length) {
    rows.innerHTML = '<tr><td colspan="6">No demo requests yet. Submit a request from the citizen form.</td></tr>';
    return;
  }
  requests.forEach(request => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(request.id)}</td><td>${escapeHtml(request.name)}</td><td>${escapeHtml(request.department)}</td><td>${escapeHtml(request.description.slice(0, 42))}${request.description.length > 42 ? "…" : ""}</td><td class="status">${escapeHtml(request.status)}</td><td><button type="button" data-update="${escapeHtml(request.id)}">${request.status === "Resolved" ? "Reopen" : "Mark resolved"}</button></td>`;
    rows.appendChild(tr);
  });
}
$("#officerRows").addEventListener("click", event => {
  const id = event.target.dataset.update;
  if (!id) return;
  const requests = loadRequests();
  const item = requests.find(request => request.id === id);
  if (!item) return;
  item.status = item.status === "Resolved" ? "Under review" : "Resolved";
  saveRequests(requests);
  renderOfficerDashboard();
  showToast("Demo request status updated.");
});

function showOfficer(show) {
  $("#officer").classList.toggle("hidden", !show);
  ["home", "services", "submit", "track", "assistant"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", show);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (show) renderOfficerDashboard();
}
$("#officerOpen").addEventListener("click", () => showOfficer(true));
$("#citizenView").addEventListener("click", () => showOfficer(false));

$("#assistantButton").addEventListener("click", () => {
  $("#assistantChat").scrollIntoView({ behavior: "smooth", block: "center" });
  $("#assistantChat").classList.add("chat-highlight");
  setTimeout(() => $("#assistantChat").classList.remove("chat-highlight"), 900);
});
$$(".quick-prompts button").forEach(button => {
  button.addEventListener("click", () => {
    const prompt = button.dataset.prompt;
    const department = classify(prompt, "Other / Not sure");
    const response = department === "Other / Not sure"
      ? "Thanks for sharing. Choose “Other / Not sure” in the complaint form and describe the issue. The team can review it."
      : `This sounds like a ${department} issue. You can select “${department}” in the complaint form and include the location and details.`;
    $("#chatResponse").textContent = response;
  });
});

renderOfficerDashboard();
