
const people = FAMILY_DATA.people;
const branches = FAMILY_DATA.branches;
const byId = Object.fromEntries(people.map(p => [p.id, p]));

function nameOf(id) {
  return byId[id]?.name || id;
}

function coupleChildren(person) {
  const spouseId = person.spouse;
  const seen = new Set();
  return people.filter(p => {
    const parents = p.parents || [];
    const match = parents.includes(person.id) || (spouseId && parents.includes(spouseId));
    if (!match || seen.has(p.id) || p.id === person.id) return false;
    seen.add(p.id);
    return true;
  });
}

function branchOptions() {
  const select = document.getElementById("branchFilter");
  [...new Set(people.map(p => p.branch).filter(Boolean))].sort().forEach(branch => {
    const opt = document.createElement("option");
    opt.value = branch;
    opt.textContent = branch;
    select.appendChild(opt);
  });
}

function renderStats() {
  const rootChildren = people.filter(p => (p.parents || []).includes("P001") && (p.parents || []).includes("P002")).length;
  const branchCount = branches.length - 1;
  document.getElementById("stats").innerHTML = `
    <div class="stat">
      <div class="stat-number">${people.length}</div>
      <div class="stat-label">people in this draft</div>
    </div>
    <div class="stat">
      <div class="stat-number">${branchCount}</div>
      <div class="stat-label">family branches</div>
    </div>
    <div class="stat">
      <div class="stat-number">${rootChildren}</div>
      <div class="stat-label">children of the root couple listed</div>
    </div>
  `;
}

function renderRoot() {
  const root = branches[0];
  document.getElementById("rootCard").innerHTML = `
    <div class="badge">Root couple</div>
    <div class="root-couple">${root.couple}</div>
    <p class="meta">${root.notes}</p>
  `;
}

function renderBranches() {
  const container = document.getElementById("branchCards");
  container.innerHTML = "";
  branches.slice(1).forEach(b => {
    const count = people.filter(p => p.branch === b.title).length;
    const card = document.createElement("article");
    card.className = "branch-card";
    card.innerHTML = `
      <div class="badge">Branch ${b.order}</div>
      <h3>${b.title}</h3>
      <p><strong>${b.couple}</strong></p>
      <p class="meta">${b.notes}</p>
      <p class="meta">${count} people currently listed</p>
    `;
    container.appendChild(card);
  });
}

function renderPeople() {
  const q = document.getElementById("search").value.toLowerCase().trim();
  const branch = document.getElementById("branchFilter").value;
  const list = document.getElementById("peopleList");
  list.innerHTML = "";

  const filtered = people
    .filter(p => !q || p.name.toLowerCase().includes(q))
    .filter(p => !branch || p.branch === branch);

  if (filtered.length === 0) {
    list.innerHTML = `<div class="no-results">No matching family members found.</div>`;
    return;
  }

  filtered.forEach(p => {
    const childCount = coupleChildren(p).length;
    const div = document.createElement("div");
    div.className = "person";
    div.innerHTML = `
      <div class="person-name">${p.name}</div>
      <div class="meta">${p.branch || "No branch"}${p.spouse ? " · spouse: " + nameOf(p.spouse) : ""}</div>
      <div class="meta">${childCount ? childCount + " child/children listed" : "No children listed yet"}</div>
    `;
    div.addEventListener("click", () => openProfile(p.id));
    list.appendChild(div);
  });
}

function listItems(items) {
  if (!items || items.length === 0) return "<p class='meta'>None listed yet.</p>";
  return "<ul>" + items.map(x => `<li>${x}</li>`).join("") + "</ul>";
}

function openProfile(id) {
  const p = byId[id];
  const spouse = p.spouse ? nameOf(p.spouse) : "";
  const parents = (p.parents || []).map(nameOf);
  const children = coupleChildren(p).map(c => c.name);

  document.getElementById("profile").innerHTML = `
    <h2 class="profile-title">${p.name}</h2>
    <p class="meta">${p.branch || "No branch"}${p.gender ? " · " + p.gender : ""}</p>

    <div class="profile-section">
      <strong>Spouse</strong>
      ${spouse ? `<p>${spouse}</p>` : "<p class='meta'>None listed yet.</p>"}
    </div>

    <div class="profile-section">
      <strong>Parents</strong>
      ${listItems(parents)}
    </div>

    <div class="profile-section">
      <strong>Children</strong>
      ${listItems(children)}
    </div>

    <div class="profile-section">
      <strong>Notes</strong>
      <p>${p.notes || "<span class='meta'>No notes yet.</span>"}</p>
    </div>
  `;
  document.getElementById("modal").classList.remove("hidden");
}

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("modal").classList.add("hidden");
});

document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") document.getElementById("modal").classList.add("hidden");
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.getElementById("modal").classList.add("hidden");
});

document.getElementById("search").addEventListener("input", renderPeople);
document.getElementById("branchFilter").addEventListener("change", renderPeople);

branchOptions();
renderStats();
renderRoot();
renderBranches();
renderPeople();
