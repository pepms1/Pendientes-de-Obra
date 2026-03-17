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
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const statusEl = document.getElementById("status");
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const activeList = document.getElementById("task-list");
const completedList = document.getElementById("completed-list");
const editActiveList = document.getElementById("edit-active-list");
const editCompletedList = document.getElementById("edit-completed-list");
const activeCount = document.getElementById("task-count");
const completedCount = document.getElementById("completed-count");
const template = document.getElementById("task-item-template");

let db;

const hasPlaceholderConfig = (config) =>
  Object.values(config).some(
    (value) => typeof value === "string" && value.includes("REEMPLAZA_CON_")
  );

const formatDate = (timestamp) => {
  if (!timestamp) return "Sin fecha";
  const date = timestamp.toDate();
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

const buildTaskItem = (docSnapshot, data, { showToggle, showDelete }) => {
  const fragment = template.content.cloneNode(true);
  const item = fragment.querySelector(".task");
  const toggle = fragment.querySelector(".task__toggle");
  const text = fragment.querySelector(".task__text");
  const meta = fragment.querySelector(".task__meta");
  const deleteButton = fragment.querySelector(".task__delete");

  text.textContent = data.text;
  meta.textContent = `Registrado: ${formatDate(data.createdAt)}`;
  toggle.checked = Boolean(data.completed);

  if (!showToggle) {
    toggle.disabled = true;
  } else {
    toggle.addEventListener("change", async () => {
      await updateDoc(doc(db, "pendientes", docSnapshot.id), {
        completed: toggle.checked,
      });
    });
  }

  if (data.completed) {
    item.classList.add("task--done");
  }

  if (showDelete) {
    deleteButton.addEventListener("click", async () => {
      await deleteDoc(doc(db, "pendientes", docSnapshot.id));
    });
  } else {
    deleteButton.remove();
  }

  return fragment;
};

const renderTasks = (snapshot) => {
  activeList.innerHTML = "";
  completedList.innerHTML = "";
  editActiveList.innerHTML = "";
  editCompletedList.innerHTML = "";

  let activeTotal = 0;
  let completedTotal = 0;

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const targetList = data.completed ? completedList : activeList;
    const editList = data.completed ? editCompletedList : editActiveList;

    if (data.completed) {
      completedTotal += 1;
    } else {
      activeTotal += 1;
    }

    targetList.appendChild(buildTaskItem(docSnapshot, data, { showToggle: true, showDelete: false }));
    editList.appendChild(buildTaskItem(docSnapshot, data, { showToggle: false, showDelete: true }));
  });

  activeCount.textContent = activeTotal.toString();
  completedCount.textContent = completedTotal.toString();
};

const init = async () => {
  try {
    if (!firebaseConfig || hasPlaceholderConfig(firebaseConfig)) {
      setStatus("Configura firebase-config.js con tus credenciales reales", "status--error");
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
  });

  input.value = "";
  input.focus();
});

init();
