import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const statusEl = document.getElementById("status");
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const list = document.getElementById("task-list");
const count = document.getElementById("task-count");
const template = document.getElementById("task-item-template");

let db;

const formatDate = (timestamp) => {
  if (!timestamp) return "Sin fecha";
  const date = timestamp.toDate ? timestamp.toDate() : timestamp;
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const setStatus = (text, variant) => {
  statusEl.textContent = text;
  statusEl.classList.remove("status--ok", "status--error");
  if (variant) {
    statusEl.classList.add(variant);
  }
};

const renderTasks = (snapshot) => {
  list.innerHTML = "";
  count.textContent = snapshot.size.toString();

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const fragment = template.content.cloneNode(true);
    const item = fragment.querySelector(".task");
    const toggle = fragment.querySelector(".task__toggle");
    const text = fragment.querySelector(".task__text");
    const meta = fragment.querySelector(".task__meta");

    const createdAt = data.createdAt ?? data.createdAtClient;

    text.textContent = data.text;
    meta.textContent = `Registrado: ${formatDate(createdAt)}`;
    toggle.checked = Boolean(data.completed);

    if (data.completed) {
      item.classList.add("task--done");
    }

    toggle.addEventListener("change", async () => {
      await updateDoc(doc(db, "pendientes", docSnapshot.id), {
        completed: toggle.checked,
      });
    });

    list.appendChild(fragment);
  });
};

const hasPlaceholderConfig = (config) =>
  Object.values(config).some((value) => String(value).startsWith("REEMPLAZA_"));

const init = async () => {
  try {
    if (hasPlaceholderConfig(firebaseConfig)) {
      setStatus("Configura Firebase", "status--error");
      return;
    }

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    const pendientesRef = collection(db, "pendientes");
    const pendientesQuery = query(pendientesRef, orderBy("createdAt", "desc"));

    onSnapshot(pendientesQuery, renderTasks, (error) => {
      console.error(error);
      setStatus("Error de sincronización", "status--error");
    });

    setStatus("Sincronizado", "status--ok");
  } catch (error) {
    console.error(error);
    setStatus("Configura Firebase", "status--error");
  }
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value || !db) {
    return;
  }

  await addDoc(collection(db, "pendientes"), {
    text: value,
    completed: false,
    createdAt: serverTimestamp(),
    createdAtClient: new Date(),
  });

  input.value = "";
  input.focus();
});

init();
