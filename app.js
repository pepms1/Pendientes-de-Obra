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
const statusDetailEl = document.getElementById("status-detail");
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

const setStatus = (text, variant, detail = "") => {
  statusEl.textContent = text;
  statusEl.classList.remove("status--ok", "status--error");
  if (variant) {
    statusEl.classList.add(variant);
  }
  statusDetailEl.textContent = detail;
};

const humanizeError = (error) => {
  if (!error) return "";
  switch (error.code) {
    case "permission-denied":
      return "Permisos insuficientes en Firestore.";
    case "unavailable":
      return "Firestore no disponible. Revisa tu conexión.";
    case "invalid-argument":
      return "Configuración inválida. Revisa firebase-config.js.";
    default:
      return error.message || "Error desconocido.";
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
      try {
        await updateDoc(doc(db, "pendientes", docSnapshot.id), {
          completed: toggle.checked,
        });
        setStatus("Sincronizado", "status--ok");
      } catch (error) {
        console.error(error);
        setStatus(
          "No se pudo actualizar",
          "status--error",
          humanizeError(error)
        );
      }
    });

    list.appendChild(fragment);
  });
};

const hasPlaceholderConfig = (config) =>
  Object.values(config).some((value) => String(value).startsWith("REEMPLAZA_"));

const init = async () => {
  try {
    if (hasPlaceholderConfig(firebaseConfig)) {
      setStatus(
        "Configura Firebase",
        "status--error",
        "Completa firebase-config.js con tu proyecto."
      );
      return;
    }

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    const pendientesRef = collection(db, "pendientes");
    const pendientesQuery = query(pendientesRef, orderBy("createdAt", "desc"));

    onSnapshot(pendientesQuery, renderTasks, (error) => {
      console.error(error);
      setStatus("Error de sincronización", "status--error", humanizeError(error));
    });

    setStatus("Sincronizado", "status--ok");
  } catch (error) {
    console.error(error);
    setStatus("Configura Firebase", "status--error", humanizeError(error));
  }
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value || !db) {
    return;
  }

  try {
    await addDoc(collection(db, "pendientes"), {
      text: value,
      completed: false,
      createdAt: serverTimestamp(),
      createdAtClient: new Date(),
    });

    input.value = "";
    input.focus();
    setStatus("Sincronizado", "status--ok");
  } catch (error) {
    console.error(error);
    setStatus(
      "No se pudo guardar",
      "status--error",
      humanizeError(error)
    );
  }
});

init();
