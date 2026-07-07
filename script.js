
const people = FAMILY_DATA.people;
const relationships = FAMILY_DATA.relationships || [];
const branches = FAMILY_DATA.branches;
const byId = Object.fromEntries(people.map(p => [p.id, p]));

function nameOf(id) {
  return byId[id]?.name || id;
}

function relationshipsOf(personId) {
  return relationships.filter(r => r.partner1 === personId || r.partner2 === personId);
}

function partnerInRelationship(rel, personId) {
  return rel.partner1 === personId ? rel.partner2 : rel.partner1;
}

function childrenOf(personId) {
  const fromRelationships = relationshipsOf(personId).flatMap(r => r.children || []);
  const fromParents = people
    .filter(p => (p.parents || []).includes(personId))
    .map(p => p.id);
  return [...new Set([...fromRelationships, ...fromParents])].map(id => byId[id]).filter(Boolean);
}

function parentsOf(person) {
  return (person.parents || []).map(id => byId[id]).filter(Boolean);
}

function siblingsOf(person) {
  const parents = person.parents || [];
  if (parents.length === 0) return [];
  return people.filter(p => p.id !== person.id && parents.some(pid => (p.parents || []).includes(pid)));
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
      <div class="stat-number">${relationships.length}</div>
      <div class="stat-label">relationships recorded</div>
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

function renderTree() {
  const container = document.getElementById("treeView");
  const rootChildren = people.filter(p => (p.parents || []).includes("P001") && (p.parents || []).includes("P002"));
  container.innerHTML = `<div class="tree"></div>`;
  const tree = container.querySelector(".tree");

  rootChildren.forEach(rootChild => {
    const branch = document.createElement("article");
    branch.className = "tree-branch";
    branch.innerHTML = `
      <div class="badge">${rootChild.branch || "Branch"}</div>
      <div class="tree-person" data-id="${rootChild.id}"><strong>${rootChild.name}</strong></div>
      <div class="tree-relationships"></div>
    `;
    const relationshipsBox = branch.querySelector(".tree-relationships");

    const rels = relationshipsOf(rootChild.id);
    if (rels.length === 0) {
      const childList = childrenOf(rootChild.id);
      if (childList.length) {
        relationshipsBox.innerHTML = `<div class="tree-relationship"><p class="meta">Children</p></div>`;
        const relDiv = relationshipsBox.querySelector(".tree-relationship");
        childList.forEach(child => {
          relDiv.insertAdjacentHTML("beforeend", `<div class="tree-children tree-person" data-id="${child.id}">${child.name}</div>`);
        });
      }
    } else {
      rels.forEach(rel => {
        const partnerId = partnerInRelationship(rel, rootChild.id);
        const partner = byId[partnerId];
        const relDiv = document.createElement("div");
        relDiv.className = "tree-relationship";
        relDiv.innerHTML = `
          <p class="meta">${rel.status}</p>
          <div class="tree-partner" data-id="${partnerId}">${partner ? partner.name : partnerId}</div>
          <div class="tree-children"></div>
        `;
        const childrenDiv = relDiv.querySelector(".tree-children");
        (rel.children || []).forEach(childId => {
          childrenDiv.insertAdjacentHTML("beforeend", `<div class="tree-person" data-id="${childId}">${nameOf(childId)}</div>`);
        });
        relationshipsBox.appendChild(relDiv);
      });
    }
    tree.appendChild(branch);
  });

  container.querySelectorAll("[data-id]").forEach(el => {
    el.addEventListener("click", () => openProfile(el.dataset.id));
  });
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
    const rels = relationshipsOf(p.id);
    const children = childrenOf(p.id);
    const relText = rels.map(r => `${r.status}: ${nameOf(partnerInRelationship(r, p.id))}`).join(" · ");

    const div = document.createElement("div");
    div.className = "person";
    div.innerHTML = `
      <div class="person-name">${p.name}</div>
      <div class="meta">${p.branch || "No branch"}${relText ? " · " + relText : ""}</div>
      <div class="meta">${children.length ? children.length + " child/children listed" : "No children listed yet"}</div>
    `;
    div.addEventListener("click", () => openProfile(p.id));
    list.appendChild(div);
  });
}

function listItems(items) {
  if (!items || items.length === 0) return "<p class='meta'>None listed yet.</p>";
  return "<ul>" + items.map(x => `<li>${typeof x === "string" ? x : x.name}</li>`).join("") + "</ul>";
}

function relationshipHtml(personId) {
  const rels = relationshipsOf(personId);
  if (rels.length === 0) return "<p class='meta'>None listed yet.</p>";

  return rels.map(rel => {
    const partnerId = partnerInRelationship(rel, personId);
    const children = (rel.children || []).map(id => byId[id]).filter(Boolean);
    return `
      <div class="relationship-box">
        <p><strong>${rel.status}:</strong> ${nameOf(partnerId)}</p>
        ${rel.notes ? `<p class="meta">${rel.notes}</p>` : ""}
        <p class="meta">Children from this relationship:</p>
        ${listItems(children)}
      </div>
    `;
  }).join("");
}

function openProfile(id) {
  const p = byId[id];
  const parents = parentsOf(p);
  const siblings = siblingsOf(p);
  const children = childrenOf(id);

  document.getElementById("profile").innerHTML = `
    <h2 class="profile-title">${p.name}</h2>
    <p class="meta">${p.branch || "No branch"}${p.gender ? " · " + p.gender : ""}</p>

    <div class="profile-section">
      <strong>Relationships</strong>
      ${relationshipHtml(id)}
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
      <strong>Siblings</strong>
      ${listItems(siblings)}
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
renderTree();
renderBranches();
renderPeople();
