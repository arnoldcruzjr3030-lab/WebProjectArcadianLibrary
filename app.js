// Import Firebase Modular SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc, 
  query,
  where,
  onSnapshot, 
  updateDoc, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider,
  signInWithPopup,
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Initialize EmailJS
if (window.emailjs) {
  try {
    window.emailjs.init("YOUR_EMAILJS_PUBLIC_KEY");
  } catch (e) {
    console.log("EmailJS initialization skipped.");
  }
}

// TODO: Replace with your actual Firebase config keys from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCIdHCbiiuAsKZRqMaKkGFKHS6MqThmW4U",
  authDomain: "arcadian-2a5b8.firebaseapp.com",
  projectId: "arcadian-2a5b8",
  storageBucket: "arcadian-2a5b8.firebasestorage.app",
  messagingSenderId: "137199539011",
  appId: "1:137199539011:web:09d86c43efa00016bc55f6",
  measurementId: "G-GPD47H9ZYY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const booksCollection = collection(db, "books");
const usersCollection = collection(db, "users");
const borrowedCollection = collection(db, "borrowed_books");

// Page Identifier
const path = window.location.pathname;
const isLoginPage = path.endsWith("login.html");
const isAdminPage = path.endsWith("admin-dashboard.html");
const isStudentPage = path.endsWith("student-dashboard.html");
const isProfilePage = path.endsWith("profile.html");

// DOM Elements
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authStudentId = document.getElementById("auth-student-id");
const studentIdContainer = document.getElementById("student-id-container");
const forgotPasswordLink = document.getElementById("forgot-password-link");
const authError = document.getElementById("auth-error");
const authTitle = document.getElementById("auth-title");
const authSubtitle = document.getElementById("auth-subtitle");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const toggleAuthModeBtn = document.getElementById("toggle-auth-mode");
const googleSigninBtn = document.getElementById("google-signin-btn");

const togglePasswordVisibilityBtn = document.getElementById("toggle-password-visibility");
const passwordEyeIcon = document.getElementById("password-eye-icon");

const loginNavBtn = document.getElementById("login-nav-btn");
const userProfile = document.getElementById("user-profile");
const userEmailDisplay = document.getElementById("user-email-display");
const logoutBtn = document.getElementById("logout-btn");
const dashboardPortalBtn = document.getElementById("dashboard-portal-btn");

const bookForm = document.getElementById("book-form");
const bookIdInput = document.getElementById("book-id");
const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const isbnInput = document.getElementById("isbn");
const categoryInput = document.getElementById("category");
const quickAddCatBtn = document.getElementById("quick-add-cat-btn");
const categoryManagerList = document.getElementById("category-manager-list");
const copiesInput = document.getElementById("copies");
const availableInput = document.getElementById("available");

const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const formTitle = document.getElementById("form-title");

const topBooksContainer = document.getElementById("top-books-container");
const tbody = document.getElementById("book-list-tbody");
const studentTbody = document.getElementById("student-list-tbody");
const studentCountBadge = document.getElementById("student-count-badge");
const pendingRequestsTbody = document.getElementById("pending-requests-tbody");
const pendingRequestBadge = document.getElementById("pending-request-count-badge");
const allRecordsTbody = document.getElementById("all-records-tbody");
const archivedRecordsTbody = document.getElementById("archived-records-tbody");
const recordsCountBadge = document.getElementById("records-count-badge");
const archivedCountBadge = document.getElementById("archived-count-badge");
const myBorrowedTbody = document.getElementById("my-borrowed-books-tbody");
const activeBorrowBadge = document.getElementById("active-borrow-count-badge");
const searchInput = document.getElementById("search-input");
const catalogCountBadge = document.getElementById("catalog-count-badge");
const categoryPillsContainer = document.querySelector(".cat-pill")?.parentElement;

const totalCountEl = document.getElementById("total-count");
const availableCountEl = document.getElementById("available-count");
const borrowedCountEl = document.getElementById("borrowed-count");

const catalogPrevBtn = document.getElementById("catalog-prev-btn");
const catalogNextBtn = document.getElementById("catalog-next-btn");
const catalogPageInfo = document.getElementById("catalog-page-info");

const recordsPrevBtn = document.getElementById("records-prev-btn");
const recordsNextBtn = document.getElementById("records-next-btn");
const recordsPageInfo = document.getElementById("records-page-info");

const profileNameDisplay = document.getElementById("profile-name-display");
const profileEmailDisplay = document.getElementById("profile-email-display");
const profileRegDate = document.getElementById("profile-reg-date");
const resetPasswordBtn = document.getElementById("reset-password-btn");
const resetAlert = document.getElementById("reset-alert");
const adminResetPwdBtn = document.getElementById("admin-reset-pwd-btn");
const adminResetAlert = document.getElementById("admin-reset-alert");
const profileHistoryTbody = document.getElementById("profile-history-tbody");
const historyCountBadge = document.getElementById("history-count-badge");
const statApprovedCount = document.getElementById("stat-approved-count");
const statPendingCount = document.getElementById("stat-pending-count");
const statTotalCount = document.getElementById("stat-total-count");

const editStudentIdInput = document.getElementById("edit-student-id-input");
const saveStudentIdBtn = document.getElementById("save-student-id-btn");
const idUpdateAlert = document.getElementById("id-update-alert");

let allBooks = [];
let activeStudentRecords = [];
let archivedStudentRecords = [];
let studentActiveBorrowedMap = new Map();
let studentBorrowRecordMap = new Map();
let isSignUpMode = false;
let unsubscribeSnapshot = null;
let unsubscribeBorrowedSnapshot = null;
let unsubscribePendingSnapshot = null;
let unsubscribeAllRecordsSnapshot = null;
let currentUserRole = "student";
let currentUserApproved = false;
let activeCategoryFilter = "ALL";

// Pagination State
let catalogCurrentPage = 1;
const catalogItemsPerPage = 5;

let recordsCurrentPage = 1;
const recordsItemsPerPage = 5;

// Fine Rate Configuration (₱10.00 per late day)
const DAILY_FINE_RATE = 10;

// Calculate accumulated fine based on due date
function calculateOverdueFine(dueDateObj) {
  if (!dueDateObj) return { isOverdue: false, daysLate: 0, fineAmount: 0 };
  const today = new Date();
  if (today <= dueDateObj) return { isOverdue: false, daysLate: 0, fineAmount: 0 };

  const diffTime = Math.abs(today - dueDateObj);
  const daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const fineAmount = daysLate * DAILY_FINE_RATE;

  return { isOverdue: true, daysLate, fineAmount };
}

// Function to Export Active Borrowing Records to Excel CSV
window.exportBorrowingRecordsToCSV = () => {
  if (activeStudentRecords.length === 0) {
    alert("No active borrowing records available to export.");
    return;
  }

  // Header row
  const headers = ["Student ID", "Student Email", "Book Title", "Author", "Status", "Borrowed Date", "Due Date", "Days Overdue", "Fine Amount (PHP)"];
  const csvRows = [headers.join(",")];

  activeStudentRecords.forEach((rec) => {
    const dueDateObj = rec.dueDate ? new Date(rec.dueDate.seconds * 1000) : null;
    const borrowedDateObj = rec.borrowedAt ? new Date(rec.borrowedAt.seconds * 1000) : null;
    const fineDetails = calculateOverdueFine(dueDateObj);

    const studentId = `"${(rec.studentId || 'N/A').replace(/"/g, '""')}"`;
    const userEmail = `"${(rec.userEmail || '').replace(/"/g, '""')}"`;
    const bookTitle = `"${(rec.bookTitle || '').replace(/"/g, '""')}"`;
    const bookAuthor = `"${(rec.bookAuthor || '').replace(/"/g, '""')}"`;
    const status = `"${(rec.status || 'pending').toUpperCase()}"`;
    const borrowedDateStr = borrowedDateObj ? `"${borrowedDateObj.toLocaleDateString("en-US")}"` : '""';
    const dueDateStr = dueDateObj ? `"${dueDateObj.toLocaleDateString("en-US")}"` : '""';
    const daysLate = fineDetails.isOverdue ? fineDetails.daysLate : 0;
    const fineAmount = fineDetails.fineAmount;

    csvRows.push([studentId, userEmail, bookTitle, bookAuthor, status, borrowedDateStr, dueDateStr, daysLate, fineAmount].join(","));
  });

  // Create Blob & trigger file download
  const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `arcadian_active_borrowing_records_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Send Email Due Date Notification Handler
window.handleSendEmailNotification = async (userEmail, bookTitle, dueDateStr, fineAmount = 0) => {
  const isOverdue = fineAmount > 0;
  
  const subject = isOverdue 
    ? `[Arcadian Library] OVERDUE NOTICE: "${bookTitle}"` 
    : `[Arcadian Library] Due Date Reminder: "${bookTitle}"`;

  const bodyText = isOverdue
    ? `Dear Student,\n\nThis is an urgent notice that your borrowed book "${bookTitle}" was due on ${dueDateStr} and is now OVERDUE.\n\nAccumulated Fine: ₱${fineAmount}.00 (₱10.00/day).\n\nPlease return the book to Arcadian Library as soon as possible.\n\nThank you,\nArcadian Library Management`
    : `Dear Student,\n\nThis is a friendly reminder that your borrowed book "${bookTitle}" is due on ${dueDateStr}.\n\nPlease ensure it is returned on time to avoid late fines (₱10/day).\n\nThank you,\nArcadian Library Management`;

  try {
    if (window.emailjs) {
      await window.emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
        to_email: userEmail,
        book_title: bookTitle,
        due_date: dueDateStr,
        fine_amount: fineAmount,
        message: bodyText
      });
      alert(`Email reminder sent successfully to ${userEmail}!`);
    } else {
      window.location.href = `mailto:${userEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    }
  } catch (err) {
    console.error("EmailJS dispatch failed:", err);
    window.location.href = `mailto:${userEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
  }
};

// Toggle Password Visibility
if (togglePasswordVisibilityBtn && authPassword && passwordEyeIcon) {
  togglePasswordVisibilityBtn.addEventListener("click", () => {
    const isPassword = authPassword.getAttribute("type") === "password";
    authPassword.setAttribute("type", isPassword ? "text" : "password");
    if (isPassword) {
      passwordEyeIcon.classList.remove("fa-eye");
      passwordEyeIcon.classList.add("fa-eye-slash");
    } else {
      passwordEyeIcon.classList.remove("fa-eye-slash");
      passwordEyeIcon.classList.add("fa-eye");
    }
  });
}

// Admin Tab Navigation Switcher
function switchAdminTab(targetTab) {
  const pageCatalog = document.getElementById("page-catalog");
  const pageBorrowing = document.getElementById("page-borrowing");
  const pageStudents = document.getElementById("page-students");

  const btnCatalog = document.getElementById("tab-btn-catalog");
  const btnBorrowing = document.getElementById("tab-btn-borrowing");
  const btnStudents = document.getElementById("tab-btn-students");

  if (!pageCatalog || !pageBorrowing || !pageStudents) return;

  [btnCatalog, btnBorrowing, btnStudents].forEach(btn => {
    if (btn) {
      btn.className = "admin-tab-btn bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl transition flex items-center gap-2";
    }
  });

  pageCatalog.classList.add("hidden");
  pageBorrowing.classList.add("hidden");
  pageStudents.classList.add("hidden");

  if (targetTab === "catalog") {
    pageCatalog.classList.remove("hidden");
    if (btnCatalog) btnCatalog.className = "admin-tab-btn active bg-indigo-600 text-white px-4 py-2 rounded-xl transition flex items-center gap-2";
  } else if (targetTab === "borrowing") {
    pageBorrowing.classList.remove("hidden");
    if (btnBorrowing) btnBorrowing.className = "admin-tab-btn active bg-indigo-600 text-white px-4 py-2 rounded-xl transition flex items-center gap-2";
  } else if (targetTab === "students") {
    pageStudents.classList.remove("hidden");
    if (btnStudents) btnStudents.className = "admin-tab-btn active bg-indigo-600 text-white px-4 py-2 rounded-xl transition flex items-center gap-2";
  }
}

document.getElementById("tab-btn-catalog")?.addEventListener("click", () => switchAdminTab("catalog"));
document.getElementById("tab-btn-borrowing")?.addEventListener("click", () => switchAdminTab("borrowing"));
document.getElementById("tab-btn-students")?.addEventListener("click", () => switchAdminTab("students"));

// Sync User Profile
async function syncUserProfile(user, inputStudentId = "") {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const newUserData = {
      email: user.email,
      displayName: user.displayName || user.email.split("@")[0],
      studentId: inputStudentId || "N/A",
      role: "student",
      approved: false,
      createdAt: new Date()
    };
    await setDoc(userRef, newUserData);
    currentUserRole = "student";
    currentUserApproved = false;
  } else {
    const data = userSnap.data();
    currentUserRole = data.role || "student";
    currentUserApproved = data.approved !== undefined ? data.approved : true;
  }
  return { role: currentUserRole, approved: currentUserApproved };
}

// Category Pills & Management
function renderCategoryPills(books) {
  const genresSet = new Set();
  books.forEach(b => {
    if (b.category && b.category.trim() !== "") {
      genresSet.add(b.category.trim());
    }
  });

  const uniqueGenres = Array.from(genresSet).sort();

  if (categoryPillsContainer) {
    let html = `
      <span class="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 flex-shrink-0">Filter:</span>
      <button class="cat-pill ${activeCategoryFilter === 'ALL' ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-slate-700 font-medium hover:bg-slate-100'} px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs shadow-sm transition whitespace-nowrap" data-cat="ALL">
        All Categories
      </button>
    `;

    uniqueGenres.forEach(genre => {
      const isActive = activeCategoryFilter.toLowerCase() === genre.toLowerCase();
      html += `
        <button class="cat-pill ${isActive ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-slate-700 font-medium hover:bg-slate-100'} px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs shadow-sm transition whitespace-nowrap" data-cat="${escapeHtml(genre)}">
          ${escapeHtml(genre)}
        </button>
      `;
    });

    categoryPillsContainer.innerHTML = html;

    categoryPillsContainer.querySelectorAll(".cat-pill").forEach((pill) => {
      pill.addEventListener("click", (e) => {
        activeCategoryFilter = e.currentTarget.getAttribute("data-cat");
        catalogCurrentPage = 1;
        renderCategoryPills(allBooks);
        renderTopBooks(allBooks);
        renderBookTable(allBooks);
      });
    });
  }

  if (categoryManagerList) {
    if (uniqueGenres.length === 0) {
      categoryManagerList.innerHTML = `<p class="text-xs text-slate-400 italic">No custom categories found.</p>`;
      return;
    }

    categoryManagerList.innerHTML = uniqueGenres.map(genre => {
      return `
        <div class="flex items-center justify-between bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs">
          <span class="font-bold text-slate-700">${escapeHtml(genre)}</span>
          <button onclick="handleDeleteCategory('${escapeHtml(genre)}')" class="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg transition font-semibold" title="Delete Category">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
    }).join("");
  }
}

window.handleDeleteCategory = async (categoryToDelete) => {
  if (currentUserRole !== "admin") {
    alert("Only Admins can delete categories.");
    return;
  }

  if (confirm(`Are you sure you want to delete the "${categoryToDelete}" category? All books under this category will revert to "General".`)) {
    try {
      const booksToUpdate = allBooks.filter(b => b.category && b.category.toLowerCase().trim() === categoryToDelete.toLowerCase().trim());
      const updatePromises = booksToUpdate.map(b => updateDoc(doc(db, "books", b.id), { category: "General" }));
      await Promise.all(updatePromises);

      if (activeCategoryFilter.toLowerCase().trim() === categoryToDelete.toLowerCase().trim()) {
        activeCategoryFilter = "ALL";
      }

      alert(`Category "${categoryToDelete}" deleted. Updated ${booksToUpdate.length} book(s) to "General".`);
    } catch (err) {
      console.error("Failed to delete category:", err);
      alert("Error deleting category: " + err.message);
    }
  }
};

function promptAddNewCategory() {
  if (!categoryInput) return;
  const newCat = prompt("Enter new category or genre name:");
  if (newCat && newCat.trim() !== "") {
    const trimmed = newCat.trim();
    let exists = false;
    for (let option of categoryInput.options) {
      if (option.value.toLowerCase() === trimmed.toLowerCase()) {
        exists = true;
        categoryInput.value = option.value;
        break;
      }
    }

    if (!exists) {
      const newOption = document.createElement("option");
      newOption.value = trimmed;
      newOption.textContent = trimmed;
      categoryInput.insertBefore(newOption, categoryInput.lastElementChild);
      categoryInput.value = trimmed;
    }
  } else {
    categoryInput.value = "General";
  }
}

if (categoryInput) {
  categoryInput.addEventListener("change", (e) => {
    if (e.target.value === "__ADD_NEW__") {
      promptAddNewCategory();
    }
  });
}

if (quickAddCatBtn) {
  quickAddCatBtn.addEventListener("click", () => {
    promptAddNewCategory();
  });
}

function populateCategoriesFromBooks(books) {
  if (!categoryInput) return;
  const existingValues = Array.from(categoryInput.options).map(opt => opt.value.toLowerCase());

  books.forEach(b => {
    if (b.category && !existingValues.includes(b.category.toLowerCase())) {
      const newOption = document.createElement("option");
      newOption.value = b.category;
      newOption.textContent = b.category;
      categoryInput.insertBefore(newOption, categoryInput.lastElementChild);
      existingValues.push(b.category.toLowerCase());
    }
  });
}

// Auth Listeners
if (isLoginPage) {
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", async () => {
      const email = authEmail.value.trim();
      if (!email) {
        if (authError) {
          authError.textContent = "Please enter your email address above, then click Forgot Password.";
          authError.classList.remove("hidden");
        }
        return;
      }

      try {
        await sendPasswordResetEmail(auth, email);
        alert(`Password reset link sent to ${email}. Check your email inbox!`);
      } catch (err) {
        if (authError) {
          authError.textContent = err.message;
          authError.classList.remove("hidden");
        }
      }
    });
  }

  if (googleSigninBtn) {
    googleSigninBtn.addEventListener("click", async () => {
      if (authError) authError.classList.add("hidden");
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err) {
        if (authError) {
          authError.textContent = err.message;
          authError.classList.remove("hidden");
        }
      }
    });
  }

  if (toggleAuthModeBtn) {
    toggleAuthModeBtn.addEventListener("click", () => {
      isSignUpMode = !isSignUpMode;
      if (authError) authError.classList.add("hidden");
      
      if (isSignUpMode) {
        authTitle.textContent = "Create an Account";
        authSubtitle.textContent = "Register as a student to access Arcadian Library";
        authSubmitBtn.textContent = "Sign Up";
        toggleAuthModeBtn.textContent = "Already have an account? Sign In";
        if (studentIdContainer) studentIdContainer.classList.remove("hidden");
      } else {
        authTitle.textContent = "Welcome Back";
        authSubtitle.textContent = "Sign in to access Arcadian Library Portal";
        authSubmitBtn.textContent = "Sign In";
        toggleAuthModeBtn.textContent = "Don't have an account? Sign Up";
        if (studentIdContainer) studentIdContainer.classList.add("hidden");
      }
    });
  }

  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (authError) authError.classList.add("hidden");
      
      const email = authEmail.value.trim();
      const password = authPassword.value;
      const studentId = authStudentId ? authStudentId.value.trim() : "";

      if (isSignUpMode && !studentId) {
        if (authError) {
          authError.textContent = "Please enter your valid Student ID Number.";
          authError.classList.remove("hidden");
        }
        return;
      }

      try {
        if (isSignUpMode) {
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          await syncUserProfile(userCred.user, studentId);
          alert("Account created! Your registration is now pending Admin approval.");
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      } catch (err) {
        if (authError) {
          authError.textContent = formatAuthError(err.code);
          authError.classList.remove("hidden");
        }
      }
    });
  }
}

function formatAuthError(code) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password should be at least 6 characters long.";
    default:
      return "Authentication failed. Please try again.";
  }
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (err) {
      console.error("Logout Error:", err);
    }
  });
}

// Auth State Routing
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userProfileStatus = await syncUserProfile(user);
    const role = userProfileStatus.role;
    const isApproved = userProfileStatus.approved;

    if (role === "student" && !isApproved) {
      if (isLoginPage) {
        if (authError) {
          authError.textContent = "Your account is pending verification by the Library Admin. Please check back later.";
          authError.classList.remove("hidden");
        }
      } else {
        alert("Your account is currently pending Admin verification.");
        await signOut(auth);
        window.location.href = "login.html";
        return;
      }
    }

    if (isLoginPage && isApproved) {
      window.location.href = role === "admin" ? "admin-dashboard.html" : "student-dashboard.html";
      return;
    }

    if (isAdminPage && role !== "admin") {
      alert("Access Denied: Only Admins can access the Admin Control Panel.");
      window.location.href = "student-dashboard.html";
      return;
    }

    if (loginNavBtn) loginNavBtn.classList.add("hidden");
    if (userProfile) {
      userProfile.classList.remove("hidden");
      userProfile.classList.add("flex");
    }

    if (dashboardPortalBtn) {
      dashboardPortalBtn.href = role === "admin" ? "admin-dashboard.html" : "student-dashboard.html";
    }

    if (userEmailDisplay) {
      userEmailDisplay.innerHTML = `
        <span>${user.displayName || user.email}</span>
        <span class="ml-1 px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${role === 'admin' ? 'bg-amber-400 text-slate-950' : 'bg-indigo-700 text-indigo-100'}">
          ${role}
        </span>
      `;
    }

    if (isAdminPage) {
      loadRegisteredStudents();
      listenToPendingBorrowRequests();
      listenToAllStudentRecords();

      const editId = sessionStorage.getItem("editBookId");
      if (editId) {
        sessionStorage.removeItem("editBookId");
        switchAdminTab("catalog");
        setTimeout(() => window.populateEditForm(editId), 300);
      }
    }

    if (isStudentPage) {
      listenToStudentBorrowedBooks(user.uid);
    }

    if (isProfilePage) {
      loadStudentProfileDetails(user);
    }
  } else {
    currentUserRole = "student";
    currentUserApproved = false;
    studentActiveBorrowedMap.clear();
    studentBorrowRecordMap.clear();
    
    if (isAdminPage || isStudentPage || isProfilePage) {
      window.location.href = "login.html";
      return;
    }

    if (loginNavBtn) loginNavBtn.classList.remove("hidden");
    if (userProfile) {
      userProfile.classList.add("hidden");
      userProfile.classList.remove("flex");
    }
  }

  listenToBookCollection();
});

// Admin Self Password Reset Button Handler
if (adminResetPwdBtn) {
  adminResetPwdBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    try {
      await sendPasswordResetEmail(auth, user.email);
      if (adminResetAlert) {
        adminResetAlert.textContent = `Password reset link successfully sent to ${user.email}. Please check your inbox.`;
        adminResetAlert.className = "p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200";
        adminResetAlert.classList.remove("hidden");
      }
    } catch (err) {
      if (adminResetAlert) {
        adminResetAlert.textContent = "Error sending reset email: " + err.message;
        adminResetAlert.className = "p-3 rounded-xl text-xs font-semibold bg-red-50 text-red-800 border border-red-200";
        adminResetAlert.classList.remove("hidden");
      }
    }
  });
}

// Function to Send Password Reset directly to any Registered Student/Staff Email
window.handleSendUserPasswordReset = async (userEmail) => {
  if (currentUserRole !== "admin") {
    alert("Only Admins can trigger user password resets.");
    return;
  }

  if (confirm(`Send a password reset email to ${userEmail}?`)) {
    try {
      await sendPasswordResetEmail(auth, userEmail);
      alert(`Password reset link sent to ${userEmail}!`);
    } catch (err) {
      console.error("Failed to send reset link:", err);
      alert("Error sending reset link: " + err.message);
    }
  }
};

// Global Handler allowing Admins to step down back to Student Role
window.handleLeaveAdminRole = async () => {
  const user = auth.currentUser;
  if (!user) return;

  if (confirm("Are you sure you want to step down from the Admin role? Your privileges will revert to a standard Student account.")) {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        role: "student"
      });

      alert("Role updated! You are now set back to a Student account.");
      window.location.href = "student-dashboard.html";
    } catch (err) {
      console.error("Error stepping down from Admin role:", err);
      alert("Failed to update role: " + err.message);
    }
  }
};

// Load Student Directory with Password Reset Action
async function loadRegisteredStudents() {
  if (!studentTbody) return;

  try {
    const querySnapshot = await getDocs(usersCollection);
    const usersList = [];

    querySnapshot.forEach((docSnap) => {
      usersList.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (studentCountBadge) {
      studentCountBadge.textContent = `${usersList.length} Accounts`;
    }

    if (usersList.length === 0) {
      studentTbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-6 text-center text-slate-400">No user accounts found.</td>
        </tr>
      `;
      return;
    }

    studentTbody.innerHTML = usersList.map((usr) => {
      const isApproved = usr.approved === true;
      const isAdminRole = usr.role === "admin";

      return `
        <tr class="hover:bg-slate-50 transition">
          <td class="py-3 px-4 font-bold text-slate-900">
            ${escapeHtml(usr.studentId || 'N/A')}
          </td>
          <td class="py-3 px-4 font-semibold text-slate-800">
            ${escapeHtml(usr.displayName || usr.email)}
            <div class="text-[11px] text-slate-400 font-normal">${escapeHtml(usr.email)}</div>
          </td>
          <td class="py-3 px-3 text-center">
            ${isAdminRole ? `
              <span class="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                <i class="fa-solid fa-user-shield mr-1"></i> Admin
              </span>
            ` : isApproved ? `
              <span class="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                <i class="fa-solid fa-check mr-1"></i> Verified Student
              </span>
            ` : `
              <span class="px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                <i class="fa-solid fa-clock mr-1"></i> Pending
              </span>
            `}
          </td>
          <td class="py-3 px-4 text-center">
            <div class="flex justify-center items-center gap-1.5 flex-wrap">
              ${!isApproved && !isAdminRole ? `
                <button onclick="handleApproveStudent('${usr.id}')" 
                  class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition">
                  Approve
                </button>
              ` : ''}

              <button onclick="handleSendUserPasswordReset('${escapeHtml(usr.email)}')" 
                class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition flex items-center gap-1">
                <i class="fa-solid fa-key"></i> Reset Password
              </button>

              ${!isAdminRole ? `
                <button onclick="handleTransferAdminRole('${usr.id}', '${escapeHtml(usr.email)}')" 
                  class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition">
                  <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i> Promote to Admin
                </button>
              ` : `
                <span class="text-xs text-slate-400 italic">Active Administrator</span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    console.error("Error loading student directory:", err);
  }
}

window.handleTransferAdminRole = async (targetUserId, userEmail) => {
  if (currentUserRole !== "admin") {
    alert("Only active Admins can grant or transfer Admin privileges.");
    return;
  }

  if (confirm(`Are you sure you want to promote ${userEmail} to an Admin? They will have full administrative control.`)) {
    try {
      await updateDoc(doc(db, "users", targetUserId), {
        role: "admin",
        approved: true
      });

      alert(`Successfully promoted ${userEmail} to Admin!`);
      loadRegisteredStudents();
    } catch (err) {
      console.error("Failed to promote user:", err);
      alert("Error promoting user: " + err.message);
    }
  }
};

window.handleApproveStudent = async (studentDocId) => {
  try {
    await updateDoc(doc(db, "users", studentDocId), { approved: true });
    alert("Student account successfully approved!");
    loadRegisteredStudents();
  } catch (err) {
    console.error("Error approving student:", err);
    alert("Failed to approve student account.");
  }
};

// Listen to all records & render Overdue Fines
function listenToAllStudentRecords() {
  if (unsubscribeAllRecordsSnapshot) unsubscribeAllRecordsSnapshot();

  unsubscribeAllRecordsSnapshot = onSnapshot(borrowedCollection, (snapshot) => {
    activeStudentRecords = [];
    archivedStudentRecords = [];

    const now = new Date();
    const oneDayInMs = 24 * 60 * 60 * 1000;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const record = { id: docSnap.id, ...data };

      let recordTime = null;
      if (data.borrowedAt && data.borrowedAt.seconds) {
        recordTime = new Date(data.borrowedAt.seconds * 1000);
      } else if (data.createdAt && data.createdAt.seconds) {
        recordTime = new Date(data.createdAt.seconds * 1000);
      }

      const isCompleted = data.status === "approved" || data.status === "declined";
      const isOlderThanOneDay = recordTime && (now - recordTime > oneDayInMs);

      if (isCompleted && isOlderThanOneDay) {
        archivedStudentRecords.push(record);
      } else {
        activeStudentRecords.push(record);
      }
    });

    if (recordsCountBadge) recordsCountBadge.textContent = `${activeStudentRecords.length} Active`;
    if (archivedCountBadge) archivedCountBadge.textContent = `${archivedStudentRecords.length} Archived`;

    renderStudentRecordsTable();
    renderArchivedRecordsTable();
  });
}

function renderStudentRecordsTable() {
  if (!allRecordsTbody) return;

  if (activeStudentRecords.length === 0) {
    allRecordsTbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-6 text-center text-slate-400 font-medium">No active student borrowing records found.</td>
      </tr>
    `;
    if (recordsPageInfo) recordsPageInfo.textContent = "Page 0 of 0";
    return;
  }

  const totalPages = Math.ceil(activeStudentRecords.length / recordsItemsPerPage);
  if (recordsCurrentPage > totalPages) recordsCurrentPage = totalPages;
  if (recordsCurrentPage < 1) recordsCurrentPage = 1;

  const startIndex = (recordsCurrentPage - 1) * recordsItemsPerPage;
  const pageItems = activeStudentRecords.slice(startIndex, startIndex + recordsItemsPerPage);

  if (recordsPageInfo) recordsPageInfo.textContent = `Page ${recordsCurrentPage} of ${totalPages}`;
  if (recordsPrevBtn) recordsPrevBtn.disabled = recordsCurrentPage === 1;
  if (recordsNextBtn) recordsNextBtn.disabled = recordsCurrentPage === totalPages;

  allRecordsTbody.innerHTML = pageItems.map((rec) => {
    const dueDateObj = rec.dueDate ? new Date(rec.dueDate.seconds * 1000) : null;
    const fineDetails = calculateOverdueFine(dueDateObj);
    const dueDateStr = dueDateObj ? dueDateObj.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

    let statusBadge = '';
    if (rec.status === 'pending') {
      statusBadge = `<span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-amber-100 text-amber-800">Pending</span>`;
    } else if (rec.status === 'approved') {
      if (fineDetails.isOverdue) {
        statusBadge = `<span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-red-100 text-red-800 border border-red-200"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Overdue (${fineDetails.daysLate}d)</span>`;
      } else {
        statusBadge = `<span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-emerald-100 text-emerald-800">Approved</span>`;
      }
    } else if (rec.status === 'declined') {
      statusBadge = `<span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-red-100 text-red-800">Declined</span>`;
    }

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-4">
          <div class="font-bold text-indigo-900">ID: ${escapeHtml(rec.studentId || 'N/A')}</div>
          <div class="text-[11px] text-slate-500">${escapeHtml(rec.userEmail)}</div>
        </td>
        <td class="py-3 px-4 font-bold text-slate-900">${escapeHtml(rec.bookTitle)}</td>
        <td class="py-3 px-3 text-center">${statusBadge}</td>
        <td class="py-3 px-3 text-center font-bold">
          ${dueDateObj ? `
            <span class="${fineDetails.isOverdue ? 'text-red-600 font-bold' : 'text-slate-700'}">
              ${dueDateStr}
            </span>
            ${fineDetails.isOverdue ? `
              <div class="text-xs font-extrabold text-red-600 mt-0.5">Fine: ₱${fineDetails.fineAmount}.00</div>
            ` : `<div class="text-[10px] text-slate-400 font-normal">Duration: ${rec.durationDays || 7} days</div>`}
          ` : '<span class="text-slate-400 italic">Awaiting Approval</span>'}
        </td>
        <td class="py-3 px-4 text-center">
          <div class="flex justify-center items-center gap-1.5">
            ${rec.status === 'approved' ? `
              <button onclick="handleSendEmailNotification('${escapeHtml(rec.userEmail)}', '${escapeHtml(rec.bookTitle)}', '${dueDateStr}', ${fineDetails.fineAmount})" 
                class="px-2 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition flex items-center gap-1">
                <i class="fa-solid fa-paper-plane"></i> Email Reminder
              </button>
            ` : ''}
            <button onclick="handleRemoveBorrowRecord('${rec.id}')" class="px-2 py-1 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition flex items-center gap-1">
              <i class="fa-solid fa-trash-can"></i> Remove
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderArchivedRecordsTable() {
  if (!archivedRecordsTbody) return;

  if (archivedStudentRecords.length === 0) {
    archivedRecordsTbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-6 text-center text-slate-400 font-medium">No archived history records found.</td>
      </tr>
    `;
    return;
  }

  archivedRecordsTbody.innerHTML = archivedStudentRecords.map((rec) => {
    const formattedDate = rec.borrowedAt ? new Date(rec.borrowedAt.seconds * 1000).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

    let statusBadge = '';
    if (rec.status === 'approved') {
      statusBadge = `<span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-emerald-100 text-emerald-800">Approved</span>`;
    } else if (rec.status === 'declined') {
      statusBadge = `<span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-red-100 text-red-800">Declined</span>`;
    }

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-4">
          <div class="font-bold text-slate-800">ID: ${escapeHtml(rec.studentId || 'N/A')}</div>
          <div class="text-[11px] text-slate-500">${escapeHtml(rec.userEmail)}</div>
        </td>
        <td class="py-3 px-4 font-bold text-slate-900">${escapeHtml(rec.bookTitle)}</td>
        <td class="py-3 px-3 text-center">${statusBadge}</td>
        <td class="py-3 px-3 text-center text-slate-600 font-medium">${formattedDate}</td>
        <td class="py-3 px-4 text-center">
          <button onclick="handleRemoveBorrowRecord('${rec.id}')" class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 border border-slate-200 transition flex items-center gap-1 mx-auto">
            <i class="fa-solid fa-trash-can"></i> Remove
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

window.handleRemoveBorrowRecord = async (recordId) => {
  if (currentUserRole !== "admin") {
    alert("Only Admins can delete borrowing records.");
    return;
  }

  if (confirm("Are you sure you want to remove this borrow record? This will clean it from the dashboard.")) {
    try {
      await deleteDoc(doc(db, "borrowed_books", recordId));
    } catch (err) {
      console.error("Failed to delete record:", err);
      alert("Error deleting record: " + err.message);
    }
  }
};

if (recordsPrevBtn) {
  recordsPrevBtn.addEventListener("click", () => {
    if (recordsCurrentPage > 1) {
      recordsCurrentPage--;
      renderStudentRecordsTable();
    }
  });
}

if (recordsNextBtn) {
  recordsNextBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(activeStudentRecords.length / recordsItemsPerPage);
    if (recordsCurrentPage < totalPages) {
      recordsCurrentPage++;
      renderStudentRecordsTable();
    }
  });
}

// Load Profile Details
async function loadStudentProfileDetails(user) {
  if (profileEmailDisplay) profileEmailDisplay.textContent = user.email;

  const leaveAdminSection = document.getElementById("leave-admin-section");

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const currentId = userData.studentId || "N/A";

      if (profileNameDisplay) {
        profileNameDisplay.textContent = `${userData.displayName || user.email.split("@")[0]} (ID: ${currentId})`;
      }
      
      if (editStudentIdInput) {
        editStudentIdInput.value = currentId !== "N/A" ? currentId : "";
      }

      if (userData.createdAt && profileRegDate) {
        profileRegDate.textContent = new Date(userData.createdAt.seconds * 1000).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' });
      }

      if (userData.role === "admin" && leaveAdminSection) {
        leaveAdminSection.classList.remove("hidden");
      }
    }
  } catch (err) {
    console.error("Error loading profile details:", err);
  }

  if (saveStudentIdBtn && editStudentIdInput) {
    saveStudentIdBtn.onclick = async () => {
      const newStudentId = editStudentIdInput.value.trim();
      if (!newStudentId) {
        if (idUpdateAlert) {
          idUpdateAlert.textContent = "Please enter a valid Student ID.";
          idUpdateAlert.className = "p-3 rounded-xl text-xs font-semibold bg-red-50 text-red-800 border border-red-200";
          idUpdateAlert.classList.remove("hidden");
        }
        return;
      }

      try {
        await updateDoc(doc(db, "users", user.uid), {
          studentId: newStudentId
        });

        if (profileNameDisplay) {
          profileNameDisplay.textContent = `${user.displayName || user.email.split("@")[0]} (ID: ${newStudentId})`;
        }

        if (idUpdateAlert) {
          idUpdateAlert.textContent = "Student ID successfully updated! Changes are now reflected in the Admin Directory.";
          idUpdateAlert.className = "p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200";
          idUpdateAlert.classList.remove("hidden");
        }
      } catch (err) {
        console.error("Error updating Student ID:", err);
        if (idUpdateAlert) {
          idUpdateAlert.textContent = "Failed to update ID: " + err.message;
          idUpdateAlert.className = "p-3 rounded-xl text-xs font-semibold bg-red-50 text-red-800 border border-red-200";
          idUpdateAlert.classList.remove("hidden");
        }
      }
    };
  }

  const q = query(borrowedCollection, where("userId", "==", user.uid));
  onSnapshot(q, (snapshot) => {
    const logs = [];
    let approved = 0;
    let pending = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      logs.push({ id: docSnap.id, ...data });
      if (data.status === 'approved') approved++;
      if (data.status === 'pending') pending++;
    });

    if (statApprovedCount) statApprovedCount.textContent = approved;
    if (statPendingCount) statPendingCount.textContent = pending;
    if (statTotalCount) statTotalCount.textContent = logs.length;
    if (historyCountBadge) historyCountBadge.textContent = `${logs.length} Items`;

    if (!profileHistoryTbody) return;

    if (logs.length === 0) {
      profileHistoryTbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-6 text-center text-slate-400 font-medium">No borrowing history found.</td>
        </tr>
      `;
      return;
    }

    profileHistoryTbody.innerHTML = logs.map((log) => {
      const reqDate = log.borrowedAt ? new Date(log.borrowedAt.seconds * 1000).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
      const dueDateObj = log.dueDate ? new Date(log.dueDate.seconds * 1000) : null;
      const fineDetails = calculateOverdueFine(dueDateObj);

      let statusBadge = '';
      if (log.status === 'pending') {
        statusBadge = `<span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-amber-100 text-amber-800">Pending</span>`;
      } else if (log.status === 'approved') {
        if (fineDetails.isOverdue) {
          statusBadge = `<span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-red-100 text-red-800 border border-red-200">Overdue (Fine: ₱${fineDetails.fineAmount})</span>`;
        } else {
          statusBadge = `<span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-emerald-100 text-emerald-800">Approved</span>`;
        }
      } else if (log.status === 'declined') {
        statusBadge = `<span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-red-100 text-red-800">Declined</span>`;
      }

      return `
        <tr class="hover:bg-slate-50 transition">
          <td class="py-3 px-4 font-bold text-slate-800">${escapeHtml(log.bookTitle)}</td>
          <td class="py-3 px-3 text-center">${statusBadge}</td>
          <td class="py-3 px-3 text-center text-slate-500 font-medium">${reqDate}</td>
          <td class="py-3 px-4 text-center font-bold ${fineDetails.isOverdue ? 'text-red-600' : 'text-slate-700'}">
            ${dueDateObj ? dueDateObj.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
          </td>
        </tr>
      `;
    }).join("");
  });
}

if (resetPasswordBtn) {
  resetPasswordBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    try {
      await sendPasswordResetEmail(auth, user.email);
      if (resetAlert) {
        resetAlert.textContent = `A password reset link was sent to ${user.email}. Check your inbox!`;
        resetAlert.className = "p-3 text-xs rounded-xl font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200";
        resetAlert.classList.remove("hidden");
      }
    } catch (err) {
      if (resetAlert) {
        resetAlert.textContent = err.message;
        resetAlert.className = "p-3 text-xs rounded-xl font-semibold bg-red-50 text-red-800 border border-red-200";
        resetAlert.classList.remove("hidden");
      }
    }
  });
}

function listenToPendingBorrowRequests() {
  if (unsubscribePendingSnapshot) unsubscribePendingSnapshot();

  const q = query(borrowedCollection, where("status", "==", "pending"));

  unsubscribePendingSnapshot = onSnapshot(q, (snapshot) => {
    const pendingList = [];
    snapshot.forEach((docSnap) => {
      pendingList.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (pendingRequestBadge) {
      pendingRequestBadge.textContent = `${pendingList.length} Pending`;
    }

    if (!pendingRequestsTbody) return;

    if (pendingList.length === 0) {
      pendingRequestsTbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-6 text-center text-slate-400 font-medium">No pending borrow requests.</td>
        </tr>
      `;
      return;
    }

    pendingRequestsTbody.innerHTML = pendingList.map((req) => {
      const reqDate = req.borrowedAt ? new Date(req.borrowedAt.seconds * 1000).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
      const duration = req.durationDays || 7;

      return `
        <tr class="hover:bg-slate-50 transition">
          <td class="py-3 px-4">
            <div class="font-bold text-indigo-900">ID: ${escapeHtml(req.studentId || 'N/A')}</div>
            <div class="text-[11px] text-slate-500">${escapeHtml(req.userEmail)}</div>
          </td>
          <td class="py-3 px-4">
            <div class="font-bold text-slate-900">${escapeHtml(req.bookTitle)}</div>
            <div class="text-[11px] text-slate-400">by ${escapeHtml(req.bookAuthor)}</div>
          </td>
          <td class="py-3 px-3 text-center text-slate-600 font-medium">
            <div>${reqDate}</div>
            <span class="inline-block mt-0.5 px-2 py-0.5 text-[10px] bg-indigo-50 text-indigo-700 font-bold rounded-md">
              Requested: ${duration} Days
            </span>
          </td>
          <td class="py-3 px-4 text-center">
            <div class="flex justify-center items-center gap-1.5">
              <button onclick="handleApproveRequest('${req.id}', '${req.bookId}', ${duration})" 
                class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition">
                <i class="fa-solid fa-check mr-1"></i> Approve
              </button>
              <button onclick="handleDeclineRequest('${req.id}')" 
                class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition">
                <i class="fa-solid fa-xmark mr-1"></i> Decline
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  });
}

function listenToStudentBorrowedBooks(userId) {
  if (unsubscribeBorrowedSnapshot) unsubscribeBorrowedSnapshot();

  const q = query(borrowedCollection, where("userId", "==", userId));

  unsubscribeBorrowedSnapshot = onSnapshot(q, (snapshot) => {
    const userRecords = [];
    studentActiveBorrowedMap.clear();
    studentBorrowRecordMap.clear();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      userRecords.push({ id: docSnap.id, ...data });
      studentActiveBorrowedMap.set(data.bookId, data.status);
      studentBorrowRecordMap.set(data.bookId, docSnap.id);
    });

    if (activeBorrowBadge) {
      activeBorrowBadge.textContent = `${userRecords.length} Records`;
    }

    renderBookTable(allBooks);

    if (!myBorrowedTbody) return;

    if (userRecords.length === 0) {
      myBorrowedTbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-6 text-center text-slate-400 font-medium">You currently have no active requests or borrowed books.</td>
        </tr>
      `;
      return;
    }

    myBorrowedTbody.innerHTML = userRecords.map((item) => {
      const dueDateObj = item.dueDate ? new Date(item.dueDate.seconds * 1000) : null;
      const fineDetails = calculateOverdueFine(dueDateObj);

      let statusBadge = '';
      if (item.status === 'pending') {
        statusBadge = `<span class="px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200"><i class="fa-solid fa-hourglass-half mr-1"></i> Pending Approval</span>`;
      } else if (item.status === 'approved') {
        if (fineDetails.isOverdue) {
          statusBadge = `<span class="px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-full bg-red-100 text-red-800 border border-red-200 animate-pulse"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Overdue (Fine: ₱${fineDetails.fineAmount}.00)</span>`;
        } else {
          statusBadge = `<span class="px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200"><i class="fa-solid fa-circle-check mr-1"></i> Approved</span>`;
        }
      } else if (item.status === 'declined') {
        statusBadge = `<span class="px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-full bg-red-100 text-red-800 border border-red-200"><i class="fa-solid fa-circle-xmark mr-1"></i> Declined</span>`;
      }

      return `
        <tr class="hover:bg-slate-50 transition">
          <td class="py-3 px-5">
            <div class="font-bold text-slate-900">${escapeHtml(item.bookTitle)}</div>
            <div class="text-xs text-slate-500 font-medium">by ${escapeHtml(item.bookAuthor)}</div>
          </td>
          <td class="py-3 px-4 text-center">
            ${statusBadge}
          </td>
          <td class="py-3 px-4 text-center">
            ${dueDateObj ? `
              <span class="font-bold ${fineDetails.isOverdue ? 'text-red-600' : 'text-slate-800'}">
                ${dueDateObj.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <div class="text-[10px] text-slate-400 font-medium">Duration: ${item.durationDays || 7} Days</div>
              ${fineDetails.isOverdue ? `<span class="mt-0.5 inline-block px-1.5 py-0.5 text-[9px] uppercase font-bold rounded bg-red-100 text-red-700">Late Fee: ₱${fineDetails.fineAmount}.00</span>` : ''}
            ` : `<span class="text-slate-400 italic">Awaiting Approval (${item.durationDays || 7} days requested)</span>`}
          </td>
          <td class="py-3 px-5 text-center">
            ${item.status === 'approved' ? `
              <button onclick="handleReturnAction('${item.bookId}', '${item.id}')" 
                class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1 mx-auto">
                <i class="fa-solid fa-rotate-left"></i> Return Book
              </button>
            ` : item.status === 'declined' ? `
              <button onclick="handleDismissRecord('${item.id}')" 
                class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition">
                Dismiss
              </button>
            ` : `
              <span class="text-xs text-slate-400 italic">In Review</span>
            `}
          </td>
        </tr>
      `;
    }).join("");
  });
}

function listenToBookCollection() {
  if (unsubscribeSnapshot) unsubscribeSnapshot();

  unsubscribeSnapshot = onSnapshot(booksCollection, (snapshot) => {
    allBooks = [];
    snapshot.forEach((docSnap) => {
      allBooks.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (totalCountEl) updateDashboardStats(allBooks);
    populateCategoriesFromBooks(allBooks);
    renderCategoryPills(allBooks);
    renderTopBooks(allBooks);
    renderBookTable(allBooks);
  }, (error) => {
    console.error("Firestore Listen Error:", error);
  });
}

function renderTopBooks(books) {
  if (!topBooksContainer) return;

  const categoryFilteredBooks = books.filter(b => {
    return activeCategoryFilter === "ALL" || 
      (b.category && b.category.toLowerCase().trim() === activeCategoryFilter.toLowerCase().trim());
  });

  if (categoryFilteredBooks.length === 0) {
    topBooksContainer.innerHTML = `<p class="col-span-full text-center text-slate-400 text-sm py-4">No popular books found in this category.</p>`;
    return;
  }

  const topBooks = [...categoryFilteredBooks]
    .sort((a, b) => ((b.copies || 1) - (b.available || 0)) - ((a.copies || 1) - (a.available || 0)))
    .slice(0, 3);

  const isAdmin = currentUserRole === "admin";

  topBooksContainer.innerHTML = topBooks.map((book) => {
    const isAvailable = book.available > 0;
    const borrowedCount = (book.copies || 1) - (book.available || 0);

    return `
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition">
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              ${escapeHtml(book.category || 'General')}
            </span>
            <span class="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
              <i class="fa-solid fa-fire"></i> ${borrowedCount} borrowed
            </span>
          </div>

          <h4 class="font-bold text-slate-900 text-base line-clamp-1">${escapeHtml(book.title)}</h4>
          <p class="text-xs text-slate-500 font-medium mb-3">by ${escapeHtml(book.author)}</p>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
          <span class="font-bold ${isAvailable ? 'text-emerald-600' : 'text-red-500'}">
            ${isAvailable ? `${book.available} Available` : 'Out of Stock'}
          </span>
          ${!isAdmin ? `
            <button onclick="handleBorrowAction('${book.id}', ${book.available})" 
              class="px-3 py-1.5 rounded-lg font-semibold text-xs transition ${isAvailable ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}" 
              ${!isAvailable ? 'disabled' : ''}>
              Request
            </button>
          ` : `
            <button onclick="populateEditForm('${book.id}')" class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
          `}
        </div>
      </div>
    `;
  }).join("");
}

function renderBookTable(books) {
  if (!tbody) return;

  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
  
  const filteredBooks = books.filter(b => {
    const matchesSearch = 
      b.title.toLowerCase().includes(searchTerm) ||
      b.author.toLowerCase().includes(searchTerm) ||
      (b.category && b.category.toLowerCase().includes(searchTerm)) ||
      (b.isbn && b.isbn.includes(searchTerm));

    const matchesCategory = 
      activeCategoryFilter === "ALL" || 
      (b.category && b.category.toLowerCase().trim() === activeCategoryFilter.toLowerCase().trim());

    return matchesSearch && matchesCategory;
  });

  if (catalogCountBadge) {
    catalogCountBadge.textContent = `${filteredBooks.length} Books`;
  }

  if (filteredBooks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="py-12 text-center text-slate-400 font-medium">
          No books found matching the selected category.
        </td>
      </tr>
    `;
    if (catalogPageInfo) catalogPageInfo.textContent = "Page 0 of 0";
    return;
  }

  const totalPages = Math.ceil(filteredBooks.length / catalogItemsPerPage);
  if (catalogCurrentPage > totalPages) catalogCurrentPage = totalPages;
  if (catalogCurrentPage < 1) catalogCurrentPage = 1;

  const startIndex = (catalogCurrentPage - 1) * catalogItemsPerPage;
  const pageBooks = filteredBooks.slice(startIndex, startIndex + catalogItemsPerPage);

  if (catalogPageInfo) catalogPageInfo.textContent = `Page ${catalogCurrentPage} of ${totalPages}`;
  if (catalogPrevBtn) catalogPrevBtn.disabled = catalogCurrentPage === 1;
  if (catalogNextBtn) catalogNextBtn.disabled = catalogCurrentPage === totalPages;

  const isAdmin = currentUserRole === "admin";

  tbody.innerHTML = pageBooks.map((book) => {
    const isAvailable = book.available > 0;
    const requestStatus = studentActiveBorrowedMap.get(book.id);
    const activeBorrowRecordId = studentBorrowRecordMap.get(book.id) || "";

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3.5 px-4">
          <div class="font-bold text-slate-900 text-sm">${escapeHtml(book.title)}</div>
          <div class="text-xs text-slate-500 font-medium">by ${escapeHtml(book.author)} ${book.isbn ? `• ISBN: ${escapeHtml(book.isbn)}` : ''}</div>
        </td>
        <td class="py-3.5 px-3">
          <span class="inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            ${escapeHtml(book.category || 'General')}
          </span>
        </td>
        <td class="py-3.5 px-3 text-center font-medium">
          <span class="${isAvailable ? 'text-emerald-600' : 'text-red-500'} font-bold">
            ${book.available}
          </span> 
          <span class="text-slate-400">/ ${book.copies}</span>
        </td>
        <td class="py-3.5 px-4 text-center">
          <div class="flex justify-center items-center gap-2">
            ${!isAdmin ? `
              ${requestStatus === 'approved' ? `
                <button onclick="handleReturnAction('${book.id}', '${activeBorrowRecordId}')" 
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition">
                  Return Book
                </button>
              ` : requestStatus === 'pending' ? `
                <span class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <i class="fa-solid fa-clock mr-1"></i> Requested
                </span>
              ` : `
                <div class="flex items-center justify-center gap-1.5">
                  <select id="duration-select-${book.id}" class="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="3">3 Days</option>
                    <option value="5">5 Days</option>
                    <option value="7" selected>7 Days (1 Wk)</option>
                    <option value="14">14 Days (2 Wks)</option>
                  </select>
                  <button onclick="handleBorrowAction('${book.id}', ${book.available})" 
                    class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow transition ${book.available <= 0 ? 'opacity-40 cursor-not-allowed' : ''}" 
                    ${book.available <= 0 ? 'disabled' : ''}>
                    Request
                  </button>
                </div>
              `}
            ` : `
              <button onclick="populateEditForm('${book.id}')" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition flex items-center gap-1">
                <i class="fa-solid fa-pen-to-square"></i> Edit
              </button>
              <button onclick="handleDelete('${book.id}')" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition flex items-center gap-1">
                <i class="fa-solid fa-trash-can"></i> Delete
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

if (catalogPrevBtn) {
  catalogPrevBtn.addEventListener("click", () => {
    if (catalogCurrentPage > 1) {
      catalogCurrentPage--;
      renderBookTable(allBooks);
    }
  });
}

if (catalogNextBtn) {
  catalogNextBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(allBooks.length / catalogItemsPerPage);
    if (catalogCurrentPage < totalPages) {
      catalogCurrentPage++;
      renderBookTable(allBooks);
    }
  });
}

function escapeHtml(str) {
  return str ? String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  }) : '';
}

function updateDashboardStats(books) {
  let totalCopies = 0;
  let availableCopies = 0;

  books.forEach((b) => {
    totalCopies += Number(b.copies) || 0;
    availableCopies += Number(b.available) || 0;
  });

  const borrowedCopies = totalCopies - availableCopies;

  if (totalCountEl) totalCountEl.textContent = totalCopies;
  if (availableCountEl) availableCountEl.textContent = availableCopies;
  if (borrowedCountEl) borrowedCountEl.textContent = borrowedCopies < 0 ? 0 : borrowedCopies;
}

if (bookForm) {
  bookForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (currentUserRole !== "admin") {
      alert("Only Admins can modify books.");
      return;
    }

    const id = bookIdInput.value;
    let categoryValue = categoryInput.value;

    if (categoryValue === "__ADD_NEW__") {
      const newCat = prompt("Enter category name:");
      categoryValue = newCat && newCat.trim() !== "" ? newCat.trim() : "General";
    }

    const bookData = {
      title: titleInput.value.trim(),
      author: authorInput.value.trim(),
      isbn: isbnInput.value.trim(),
      category: categoryValue,
      copies: parseInt(copiesInput.value, 10),
      available: parseInt(availableInput.value, 10)
    };

    try {
      if (id) {
        await updateDoc(doc(doc(db, "books", id)), bookData);
      } else {
        await addDoc(booksCollection, bookData);
      }
      resetForm();
    } catch (err) {
      console.error("Error saving book:", err);
      alert("Error saving book: " + err.message);
    }
  });
}

window.populateEditForm = (id) => {
  if (!isAdminPage) {
    sessionStorage.setItem("editBookId", id);
    window.location.href = "admin-dashboard.html";
    return;
  }

  switchAdminTab("catalog");

  const book = allBooks.find((b) => b.id === id);
  if (!book) return;

  if (bookIdInput) bookIdInput.value = book.id;
  if (titleInput) titleInput.value = book.title;
  if (authorInput) authorInput.value = book.author;
  if (isbnInput) isbnInput.value = book.isbn || "";
  
  if (categoryInput) {
    const catVal = book.category || "General";
    let hasOption = Array.from(categoryInput.options).some(opt => opt.value === catVal);
    if (!hasOption) {
      const newOpt = document.createElement("option");
      newOpt.value = catVal;
      newOpt.textContent = catVal;
      categoryInput.insertBefore(newOpt, categoryInput.lastElementChild);
    }
    categoryInput.value = catVal;
  }

  if (copiesInput) copiesInput.value = book.copies;
  if (availableInput) availableInput.value = book.available;

  if (formTitle) formTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-indigo-600"></i> Edit Book Details`;
  if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-check"></i> Update Book`;
  if (cancelBtn) cancelBtn.classList.remove("hidden");

  if (bookForm) bookForm.scrollIntoView({ behavior: 'smooth' });
};

function resetForm() {
  if (!bookForm) return;
  bookIdInput.value = "";
  bookForm.reset();
  formTitle.innerHTML = `<i class="fa-solid fa-plus-circle text-indigo-600"></i> Add New Book`;
  submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Book`;
  cancelBtn.classList.add("hidden");
}

if (cancelBtn) cancelBtn.addEventListener("click", resetForm);

window.handleBorrowAction = async (bookId, currentAvailable) => {
  if (!auth.currentUser) {
    alert("Please sign in or create an account with your Student ID to submit borrowing requests.");
    window.location.href = "login.html";
    return;
  }

  if (currentUserRole === "admin") {
    alert("Admins cannot request to borrow books.");
    return;
  }
  if (currentAvailable <= 0) {
    alert("This book is currently out of stock.");
    return;
  }

  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;

  const user = auth.currentUser;

  if (studentActiveBorrowedMap.has(bookId)) {
    alert("You already have an active request or borrowed copy for this book.");
    return;
  }

  const durationSelect = document.getElementById(`duration-select-${bookId}`);
  const requestedDays = durationSelect ? parseInt(durationSelect.value, 10) : 7;

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const studentIdVal = userSnap.exists() ? (userSnap.data().studentId || "N/A") : "N/A";

    const now = new Date();

    await addDoc(borrowedCollection, {
      bookId: bookId,
      bookTitle: book.title,
      bookAuthor: book.author,
      userId: user.uid,
      userEmail: user.email,
      studentId: studentIdVal,
      borrowedAt: now,
      durationDays: requestedDays,
      dueDate: null,
      status: "pending"
    });

    alert(`Borrow request submitted for ${requestedDays} days! Waiting for Admin approval.`);
  } catch (err) {
    console.error("Request failed:", err);
  }
};

window.handleApproveRequest = async (requestId, bookId, durationDays = 7) => {
  try {
    const bookSnap = await getDoc(doc(db, "books", bookId));
    if (!bookSnap.exists()) {
      alert("Book no longer exists.");
      return;
    }

    const bookData = bookSnap.data();
    if ((bookData.available || 0) <= 0) {
      alert("Cannot approve request: Book is out of available stock.");
      return;
    }

    const now = new Date();
    const dueDate = new Date();
    dueDate.setDate(now.getDate() + durationDays);

    await updateDoc(doc(db, "books", bookId), { available: bookData.available - 1 });

    await updateDoc(doc(db, "borrowed_books", requestId), {
      status: "approved",
      borrowedAt: now,
      dueDate: dueDate
    });

  } catch (err) {
    console.error("Approve failed:", err);
  }
};

window.handleDeclineRequest = async (requestId) => {
  try {
    await updateDoc(doc(db, "borrowed_books", requestId), {
      status: "declined"
    });
  } catch (err) {
    console.error("Decline failed:", err);
  }
};

window.handleDismissRecord = async (requestId) => {
  try {
    await deleteDoc(doc(db, "borrowed_books", requestId));
  } catch (err) {
    console.error("Dismiss failed:", err);
  }
};

window.handleReturnAction = async (bookId, borrowRecordId) => {
  if (!auth.currentUser) {
    window.location.href = "login.html";
    return;
  }

  const user = auth.currentUser;
  let docIdToDelete = borrowRecordId;

  try {
    if (!docIdToDelete) {
      const q = query(
        borrowedCollection,
        where("userId", "==", user.uid),
        where("bookId", "==", bookId),
        where("status", "==", "approved")
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        docIdToDelete = querySnap.docs[0].id;
      }
    }

    const bookSnap = await getDoc(doc(db, "books", bookId));
    if (bookSnap.exists()) {
      const bookData = bookSnap.data();
      const newAvailable = (bookData.available || 0) + 1;
      await updateDoc(doc(db, "books", bookId), { available: newAvailable });
    }

    if (docIdToDelete) {
      await deleteDoc(doc(db, "borrowed_books", docIdToDelete));
    }
  } catch (err) {
    console.error("Return failed:", err);
    alert("Return transaction failed: " + err.message);
  }
};

window.handleDelete = async (id) => {
  if (currentUserRole !== "admin") {
    alert("Only Admins can delete books.");
    return;
  }

  if (confirm("Are you sure you want to delete this book from Arcadian?")) {
    try {
      await deleteDoc(doc(db, "books", id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }
};

if (searchInput) {
  searchInput.addEventListener("input", () => {
    catalogCurrentPage = 1;
    renderBookTable(allBooks);
  });
}