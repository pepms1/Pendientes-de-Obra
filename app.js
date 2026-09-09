import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  addDoc,
  collection,
  getDocs,
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

const SELECTED_OBRA_STORAGE_KEY = "pendientes-de-obra:selectedObraId";
const ALL_OBRAS_VALUE = "__todas__";

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

const obraSelect = document.getElementById("obra-select");
const obraAddToggle = document.getElementById("obra-add-toggle");
const obraForm = document.getElementById("obra-form");
const obraInput = document.getElementById("obra-input");
const currentObraLabel = document.getElementById("current-obra-label");

const summaryList = document.getElementById("summary-list");
const summaryTotal = document.getElementById("summary-total");
const summaryEmpty = document.getElementById("summary-empty");
const summaryItemTemplate = document.getElementById("summary-item-template");

let db;
let obras = [];
let pendientes = [];
let selectedObraId = localStorage.getItem(SELECTED_OBRA_STORAGE_KEY) || ALL_OBRAS_VALUE;

const handleActionError = (error) => {
  const errorCode = error?.code || "desconocido";
  const errorMessage = error?.message || "Sin detalles";
  console.error(error);
  setStatus(buildSyncErrorStatus(errorCode, errorMessage), "status--error");
};

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

const getSyncErrorSuggestion = (code) => {
  switch (code) {
    case "permission-denied":
      return "Verifica permisos de Firebase o inicia sesión con una cuenta autorizada.";
    case "unavailable":
      return "Comprueba tu conexión a internet y vuelve a intentarlo.";
    case "failed-precondition":
      return "Revisa la configuración o índices de Firestore en Firebase.";
    default:
      return "Intenta recargar la página si el problema persiste.";
  }
};

const buildSyncErrorStatus = (code, message) => {
  const suggestion = getSyncErrorSuggestion(code);
  return `Error de sincronización: ${code}. ${suggestion} (${message})`;
};

const getInitErrorStatus = (code, message) => {
  switch (code) {
    case "auth/operation-not-allowed":
      return "Activa Anonymous en Firebase Authentication para permitir acceso con reglas autenticadas.";
    case "auth/unauthorized-domain":
      return "Agrega este dominio en Authentication > Settings > Authorized domains (ejemplo: localhost).";
    case "auth/invalid-api-key":
      return "La apiKey de firebase-config.js no es válida. Revisa y copia nuevamente el firebaseConfig.";
    case "auth/app-not-authorized":
      return "La app no está autorizada en Firebase. Verifica projectId, appId y dominio autorizado.";
    case "auth/network-request-failed":
      return "No se pudo conectar con Firebase. Revisa tu conexión a internet y vuelve a intentar.";
    default:
      return `Error de inicialización: ${code}. Revisa Firebase Config/Auth. (${message})`;
  }
};

const getObraName = (obraId) =>
  obras.find((obra) => obra.id === obraId)?.nombre || "Sin obra asignada";

const closeObraForm = () => {
  obraForm.hidden = true;
  obraAddToggle.setAttribute("aria-expanded", "false");
  obraAddToggle.textContent = "+ Nueva obra";
};

const setSelectedObra = (obraId) => {
  selectedObraId = obraId || ALL_OBRAS_VALUE;
  localStorage.setItem(SELECTED_OBRA_STORAGE_KEY, selectedObraId);
  obraSelect.value = selectedObraId;
  renderScopedTasks();
  renderSummary();
};

const renderObraSelect = () => {
  obraSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = ALL_OBRAS_VALUE;
  allOption.textContent = "Todas las obras";
  obraSelect.appendChild(allOption);

  obras.forEach((obra) => {
    const option = document.createElement("option");
    option.value = obra.id;
    option.textContent = obra.nombre;
    obraSelect.appendChild(option);
  });

  const isValidSelection =
    selectedObraId === ALL_OBRAS_VALUE || obras.some((obra) => obra.id === selectedObraId);
  if (!isValidSelection) {
    selectedObraId = ALL_OBRAS_VALUE;
    localStorage.setItem(SELECTED_OBRA_STORAGE_KEY, selectedObraId);
  }
  obraSelect.value = selectedObraId;
};

const buildTaskItem = (docSnapshot, data, { showToggle, showDelete, showObra }) => {
  const fragment = template.content.cloneNode(true);
  const item = fragment.querySelector(".task");
  const toggle = fragment.querySelector(".task__toggle");
  const text = fragment.querySelector(".task__text");
  const meta = fragment.querySelector(".task__meta");
  const deleteButton = fragment.querySelector(".task__delete");

  text.textContent = data.text;
  meta.textContent = showObra
    ? `${getObraName(data.obraId)} · Registrado: ${formatDate(data.createdAt)}`
    : `Registrado: ${formatDate(data.createdAt)}`;
  toggle.checked = Boolean(data.completed);

  if (!showToggle) {
    toggle.disabled = true;
  } else {
    toggle.addEventListener("change", async () => {
      try {
        await updateDoc(doc(db, "pendientes", docSnapshot.id), {
          completed: toggle.checked,
        });
      } catch (error) {
        handleActionError(error);
      }
    });
  }

  if (data.completed) {
    item.classList.add("task--done");
  }

  if (showDelete) {
    deleteButton.addEventListener("click", async () => {
      try {
        await deleteDoc(doc(db, "pendientes", docSnapshot.id));
      } catch (error) {
        handleActionError(error);
      }
    });
  } else {
    deleteButton.remove();
  }

  return fragment;
};

const renderScopedTasks = () => {
  activeList.innerHTML = "";
  completedList.innerHTML = "";
  editActiveList.innerHTML = "";
  editCompletedList.innerHTML = "";

  const isAllView = selectedObraId === ALL_OBRAS_VALUE;
  const scoped = isAllView
    ? pendientes
    : pendientes.filter((item) => item.data.obraId === selectedObraId);

  let activeTotal = 0;
  let completedTotal = 0;

  scoped.forEach(({ docSnapshot, data }) => {
    const targetList = data.completed ? completedList : activeList;
    const editList = data.completed ? editCompletedList : editActiveList;

    if (data.completed) {
      completedTotal += 1;
    } else {
      activeTotal += 1;
    }

    targetList.appendChild(
      buildTaskItem(docSnapshot, data, { showToggle: true, showDelete: false, showObra: isAllView })
    );
    editList.appendChild(
      buildTaskItem(docSnapshot, data, { showToggle: false, showDelete: true, showObra: isAllView })
    );
  });

  activeCount.textContent = activeTotal.toString();
  completedCount.textContent = completedTotal.toString();

  const hasSpecificObra = !isAllView && obras.some((obra) => obra.id === selectedObraId);
  form.querySelector("button").disabled = !hasSpecificObra;
  input.disabled = !hasSpecificObra;

  if (isAllView) {
    currentObraLabel.textContent =
      obras.length > 0
        ? "Viendo pendientes de todas las obras. Selecciona una obra para agregar pendientes nuevos."
        : "Agrega una obra para comenzar a registrar pendientes.";
  } else {
    currentObraLabel.textContent = hasSpecificObra
      ? `Trabajando en: ${getObraName(selectedObraId)}`
      : "Agrega una obra para comenzar a registrar pendientes.";
  }
};

const renderSummary = () => {
  summaryList.innerHTML = "";

  const countsByObra = new Map();
  let total = 0;

  pendientes.forEach(({ data }) => {
    if (data.completed) return;
    total += 1;
    const key = data.obraId || "";
    countsByObra.set(key, (countsByObra.get(key) || 0) + 1);
  });

  summaryTotal.textContent = total.toString();
  summaryEmpty.hidden = pendientes.length > 0;

  const rows = obras.map((obra) => ({
    id: obra.id,
    nombre: obra.nombre,
    count: countsByObra.get(obra.id) || 0,
  }));

  if (countsByObra.has("")) {
    rows.push({ id: "", nombre: "Sin obra asignada", count: countsByObra.get("") });
  }

  rows.forEach((row) => {
    const fragment = summaryItemTemplate.content.cloneNode(true);
    const button = fragment.querySelector(".summary-item__button");
    const name = fragment.querySelector(".summary-item__name");
    const count = fragment.querySelector(".summary-item__count");

    name.textContent = row.nombre;
    count.textContent = row.count.toString();

    if (row.id === selectedObraId) {
      button.classList.add("summary-item__button--active");
    }

    if (row.id) {
      button.addEventListener("click", () => setSelectedObra(row.id));
    } else {
      button.disabled = true;
    }

    summaryList.appendChild(fragment);
  });
};

const ensureDefaultObra = async () => {
  const obrasSnapshot = await getDocs(collection(db, "obras"));
  if (!obrasSnapshot.empty) return;

  const pendientesSnapshot = await getDocs(collection(db, "pendientes"));
  if (pendientesSnapshot.empty) return;

  const defaultObraRef = await addDoc(collection(db, "obras"), {
    nombre: "Calderón de la Barca",
    createdAt: serverTimestamp(),
  });

  const migrations = [];
  pendientesSnapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    if (!data.obraId) {
      migrations.push(
        updateDoc(doc(db, "pendientes", docSnapshot.id), { obraId: defaultObraRef.id })
      );
    }
  });
  await Promise.all(migrations);
};

const subscribeToObras = () => {
  const obrasQuery = query(collection(db, "obras"), orderBy("nombre"));
  onSnapshot(
    obrasQuery,
    (snapshot) => {
      obras = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        nombre: docSnapshot.data().nombre,
      }));
      renderObraSelect();
      renderScopedTasks();
      renderSummary();
    },
    handleActionError
  );
};

const subscribeToPendientes = () => {
  const pendientesQuery = query(collection(db, "pendientes"), orderBy("createdAt", "desc"));
  let hasReceivedFirstSnapshot = false;

  onSnapshot(
    pendientesQuery,
    (snapshot) => {
      pendientes = snapshot.docs.map((docSnapshot) => ({
        docSnapshot,
        data: docSnapshot.data(),
      }));
      renderScopedTasks();
      renderSummary();
      if (!hasReceivedFirstSnapshot) {
        hasReceivedFirstSnapshot = true;
        setStatus("Sincronizado", "status--ok");
      }
    },
    handleActionError
  );
};

const init = async () => {
  try {
    if (!firebaseConfig || hasPlaceholderConfig(firebaseConfig)) {
      setStatus("Configura firebase-config.js con tus credenciales reales", "status--error");
      return;
    }

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    await signInAnonymously(auth);
    db = getFirestore(app);

    try {
      await ensureDefaultObra();
    } catch (error) {
      console.warn("No se pudo migrar a una obra por defecto:", error);
    }

    subscribeToObras();
    subscribeToPendientes();
  } catch (error) {
    const errorCode = error?.code || "desconocido";
    const errorMessage = error?.message || "Sin detalles";
    console.error(error);
    if (error?.code === "auth/operation-not-allowed") {
      setStatus(
        "Activa Anonymous en Firebase Authentication para permitir acceso con reglas autenticadas.",
        "status--error"
      );
      return;
    }

    setStatus(getInitErrorStatus(errorCode, errorMessage), "status--error");
  }
};

obraSelect.addEventListener("change", () => {
  setSelectedObra(obraSelect.value);
});

obraAddToggle.addEventListener("click", () => {
  const willOpen = obraForm.hidden;
  obraForm.hidden = !willOpen;
  obraAddToggle.setAttribute("aria-expanded", String(willOpen));
  obraAddToggle.textContent = willOpen ? "Cancelar" : "+ Nueva obra";
  if (willOpen) {
    obraInput.focus();
  }
});

obraForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = obraInput.value.trim();
  if (!value || !db) {
    return;
  }

  try {
    const obraRef = await addDoc(collection(db, "obras"), {
      nombre: value,
      createdAt: serverTimestamp(),
    });

    obraInput.value = "";
    closeObraForm();
    setSelectedObra(obraRef.id);
  } catch (error) {
    handleActionError(error);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value || !db || selectedObraId === ALL_OBRAS_VALUE || !obras.some((obra) => obra.id === selectedObraId)) {
    return;
  }

  try {
    await addDoc(collection(db, "pendientes"), {
      text: value,
      completed: false,
      obraId: selectedObraId,
      createdAt: serverTimestamp(),
    });

    input.value = "";
    input.focus();
  } catch (error) {
    handleActionError(error);
  }
});

init();
