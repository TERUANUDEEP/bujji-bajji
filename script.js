const API_ROOT = "http://localhost:3000";
const ADMIN_EMAIL = "teruanudeep987@gmail.com";
let itemsData = [];
let activeFilter = "All";

let orderProcessing = false;
function protectPage() {
  let loggedIn = localStorage.getItem("isLoggedIn");
  if (!loggedIn) {
    window.location.href = "login.html";
  }
}

function formatName(name) {
  if (!name) return "Guest";
  return name
    .split(" ")
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}


function updateAccountUI() {

  let email =
    localStorage.getItem(
      "userEmail"
    ) || "";

  let savedName =
    localStorage.getItem(
      "userName"
    ) || "";

  let displayName =
    savedName ||

    email
    .split("@")[0]
    .replace(/[^a-zA-Z0-9]/g, " ");

  displayName =
    formatName(displayName);

  let heroName =
    document.getElementById(
      "userName"
    );

  let accountName =
    document.getElementById(
      "accountName"
    );

  let accountEmail =
    document.getElementById(
      "accountEmail"
    );

  if (heroName) {

    heroName.innerText =
      displayName;

  }

  if (accountName) {

    accountName.innerText =
      displayName;

  }

  if (accountEmail) {

    accountEmail.innerText =
      email;

  }

}


async function fetchUserProfile() {
  let email = localStorage.getItem("userEmail");
  if (!email) return;
  try {
    let res = await fetch(`${API_ROOT}/user/${encodeURIComponent(email)}`);
    if (!res.ok) return;
    let data = await res.json();
    if (data.name) {
      localStorage.setItem("userName", data.name);
      localStorage.setItem("userRole", data.role);
      let managementBtn =
  document.getElementById(
    "managementBtn"
  );

if (
  managementBtn &&
  data.role === "superadmin"
) {

  managementBtn.classList.remove(
    "hidden"
  );

}
      updateAccountUI();
    }
  } catch (err) {
    console.log("fetchUserProfile error", err);
  }
}

function toggleAccountMenu() {
  let menu = document.getElementById("accountMenu");
  if (!menu) return;
  menu.classList.toggle("hidden");
}

function hideAccountMenuOnClickOutside(event) {
  let menu = document.getElementById("accountMenu");
  let button = event.target.closest("button[onclick='toggleAccountMenu()']");
  if (!menu || button) return;
  if (!menu.contains(event.target)) {
    menu.classList.add("hidden");
  }
}

function showChangeAvatarDialog(){

document
.getElementById(
"avatarModal"
)
.classList.remove(
"hidden"
);

}
function showChangeEmailDialog(){

document
.getElementById(
"changeEmailModal"
)
.classList.remove(
"hidden"
);

}

function showComplaintDialog() {

document.getElementById(
"complaintModal"
).classList.remove(
"hidden"
);

}

function logout() {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userName");
  localStorage.removeItem("rememberedLogin");
  localStorage.removeItem("cart");
  localStorage.removeItem("favorites");
  window.location.href = "login.html";
}

function setActiveCategoryButton(category) {
  document.querySelectorAll("#categoryBar button").forEach(btn => {
    if (btn.dataset.category === category) {
      btn.classList.add("bg-orange-500", "text-black");
      btn.classList.remove("bg-white/10", "text-white");
    } else {
      btn.classList.remove("bg-orange-500", "text-black");
      btn.classList.add("bg-white/10", "text-white");
    }
  });
}

function renderCategoryBar() {
  let bar = document.getElementById("categoryBar");
  if (!bar) return;
  let categories = ["All", "Popular", "Crispy", "Spicy", "Sweet", "New"];
  categories = Array.from(new Set(categories.concat(itemsData.flatMap(item => item.categories))));
  bar.innerHTML = categories.map(category => `
    <button data-category="${category}" onclick="applyFilter('${category}')" class="rounded-full bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-orange-500/90 relative group">
      ${category}
      ${category !== "All" ? `<span class="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition" onclick="event.stopPropagation(); applyFilter('All')">✕</span>` : ""}
    </button>
  `).join("");
  setActiveCategoryButton(activeFilter);
}

function sanitizeString(value) {
  return value.replace(/'/g, "\\'").replace(/\"/g, "\\\"");
}

function renderItems(items) {
  let grid = document.getElementById("itemGrid");
  if (!grid) return;
  if (!items || items.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full rounded-3xl border border-white/10 bg-white/10 p-10 text-center text-white">
        <p class="text-xl font-semibold">No items found.</p>
        <p class="mt-2 text-slate-300">Try another category or search phrase.</p>
      </div>
    `;
    return;
  }

  let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  grid.innerHTML = items.map(item => {
    let isFavorite = favorites.includes(item.name);
    let safeName = item.name.replace(/`/g, "\\`");
    let rating = Number(item.avgRating || 0).toFixed(1);
    let stars = Math.round(item.avgRating || 0);
    let starHtml = Array.from({ length: 5 }, (_, index) => `
      <span class="${index < stars ? 'text-yellow-300' : 'text-white/50'}">★</span>
    `).join("");
    return `
      <article class="bajji-card rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl text-white transition hover:-translate-y-1">
        <div class="space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-orange-200">${item.categories.join(" • ")}</p>
              <h3 class="mt-3 text-2xl font-semibold">${item.name}</h3>
            </div>
            <button id="fav-${item._id}" class="fav-btn text-2xl transition hover:scale-110" data-item-name="${item.name.replace(/"/g, '&quot;')}">
              ${isFavorite ? "💖" : "🤍"}
            </button>
          </div>

          <div class="grid gap-4 md:grid-cols-[1.2fr_auto] items-center">
            <div class="space-y-2">
              <p class="text-sm text-slate-200">${item.description || "Crispy, golden, perfect for every snack attack."}</p>
              <div class="flex flex-wrap gap-2">
                ${item.categories.map(cat => `<span class="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">${cat}</span>`).join("")}
              </div>
            </div>
            <img
src="${item.image || 'logo.png'}"
alt="${item.name}"
class="h-28 w-28 rounded-3xl object-cover shadow-xl"
onerror="this.src='logo.png'"
/>          </div>

          <div class="flex items-center justify-between gap-3">
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-sm">
                ${starHtml}
              </div>
              <p class="text-xs text-slate-300">${rating} · ${item.ratings?.length || 0} reviews</p>
            </div>
            <span class="text-2xl font-semibold text-orange-300">₹${item.price}</span>
          </div>

          <div class="flex flex-wrap items-center gap-3">

  <div class="flex gap-2">

  <button
    class="add-to-cart-btn rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-black"
    data-item-name="${item.name.replace(/"/g, '&quot;')}"
    data-item-price="${item.price}"
    data-item-image="${item.image.replace(/"/g, '&quot;')}">

    🛒 Add To Cart

  </button>

  <button
    class="buy-now-btn rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-black"
    data-item-name="${item.name.replace(/"/g, '&quot;')}"
    data-item-price="${item.price}"
    data-item-image="${item.image.replace(/"/g, '&quot;')}">

    ⚡ Buy Now

  </button>

</div>
  <div class="flex items-center gap-2 text-sm text-slate-100">

    <span>Rate it</span>

    ${[1,2,3,4,5].map(score => `
      <button
        class="rate-btn rounded-full bg-white/10 px-2 py-1 transition hover:bg-orange-500/90"
        data-item-id="${item._id}"
        data-score="${score}">
        ${score}
      </button>
    `).join("")}

  </div>

  ${
  ["admin","superadmin"].includes(
    localStorage.getItem("userRole")
  )
    ? `
    <button
      class="edit-item-btn bg-blue-500 px-4 py-2 rounded-xl"
      data-item-id="${item._id}">
      ✏ Edit
    </button>
    `
    : ""
}

${
  localStorage.getItem("userRole")
    === "superadmin"
    ? `
    <button
      class="delete-item-btn bg-red-500 px-4 py-2 rounded-xl"
      data-item-id="${item._id}">
      🗑 Delete
    </button>
    `
    : ""
}

</div>
        </div>
      </article>
    `;
  }).join("");
}


document.addEventListener("click", async e => {

  if (
    e.target.classList.contains(
      "delete-item-btn"
    )
  ) {

    let itemId =
      e.target.dataset.itemId;

    document.getElementById(
  "deleteItemId"
).value = itemId;

document.getElementById(
  "deleteModal"
).classList.remove(
  "hidden"
);

return;

    try {

      let res =
        await fetch(
  `${API_ROOT}/delete-item/${itemId}`,
  {
    method:"DELETE",

    headers:{
      "Content-Type":
      "application/json"
    },

    body:JSON.stringify({

      email:
      localStorage.getItem(
        "userEmail"
      )

    })
  }
)
      let data =
        await res.json();

      showToast(
        data.message
      );

      loadItems();

    } catch(err) {

      console.log(err);

    }

  }

});

document.addEventListener("click", e => {

  if (
    e.target.classList.contains(
      "edit-item-btn"
    )
  ) {

    let itemId =
      e.target.dataset.itemId;

    let item =
      itemsData.find(
        i => i._id == itemId
      );

    if (!item) return;

    document.getElementById(
      "editItemId"
    ).value = item._id;

    document.getElementById(
      "editItemName"
    ).value = item.name;

    document.getElementById(
      "editItemPrice"
    ).value = item.price;

    document.getElementById(
      "editItemDescription"
    ).value =
      item.description || "";

    document.getElementById(
      "editModal"
    ).classList.remove(
      "hidden"
    );

  }

});

function attachItemEventListeners() {

  let grid =
    document.getElementById(
      "itemGrid"
    );

  if (!grid) return;

  // Prevent duplicate listeners
  if (
    grid.dataset.listenerAttached
  ) {
    return;
  }

  grid.dataset.listenerAttached =
    "true";

  grid.addEventListener(
    "click",
    async (e) => {

      if (
        e.target.classList.contains(
          "fav-btn"
        )
      ) {

        let itemName =
          e.target.dataset.itemName;

        toggleFavorite(
          itemName,
          e.target
        );

      }

      if (
        e.target.classList.contains(
          "add-to-cart-btn"
        )
      ) {

        let name =
          e.target.dataset.itemName;

        let price =
          e.target.dataset.itemPrice;

        let image =
          e.target.dataset.itemImage;

        addToCart(
          name,
          price,
          image
        );

      }

      if (
        e.target.classList.contains(
          "buy-now-btn"
        )
      ) {

        let name =
          e.target.dataset.itemName;

        let price =
          e.target.dataset.itemPrice;

        let image =
          e.target.dataset.itemImage;

        addToCart(
          name,
          price,
          image
        );

        window.location.href =
          "cart.html";

      }

      if (
        e.target.classList.contains(
          "rate-btn"
        )
      ) {

        let itemId =
          e.target.dataset.itemId;

        let score =
          e.target.dataset.score;

        await submitRating(
          itemId,
          score
        );

      }

    }
  );

}
function applyFilter(category) {
  activeFilter = category;
  setActiveCategoryButton(category);
  let searchText = document.getElementById("searchInput")?.value.toLowerCase() || "";
  let filtered = itemsData.filter(item => {
    let matchesCategory = category === "All" || item.categories.includes(category);
    let matchesSearch = !searchText || [item.name, item.description, item.categories.join(" ")].join(" ").toLowerCase().includes(searchText);
    return matchesCategory && matchesSearch;
  });
  renderItems(filtered);
  attachItemEventListeners();
  const itemGrid = document.getElementById("itemGrid");

if (itemGrid) {

  const rect = itemGrid.getBoundingClientRect();

  // Only move if items are not visible yet

  if (rect.top > 250) {

    window.scrollBy({

      top: 120,

      behavior: "smooth"

    });

  }

}

}

function handleHeroCategory(category) {
  applyFilter(category);
  scrollToSection("itemGrid");
}

function scrollToSection(id) {
  let el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadItems() {

  try {
 let res =
  await fetch(
    `${API_ROOT}/items`
  );

  if (res.ok) {
    let dbItems = await res.json();

    console.log("🔥 MongoDB Items:", dbItems);

    if (dbItems.length > 0) {
      itemsData = dbItems;
    }
  }
} catch (err) {
  console.log("Mongo load failed", err);
}
  let grid =
    document.getElementById("itemGrid");

  if (!grid) return;

  // 🔥 BEAUTIFUL 20+ ITEMS ACROSS 5 CATEGORIES
  // itemsData = [

  //   {
  //     _id: "1",
  //     name: "Paneer Bajji",
  //     description: "Creamy paneer wrapped in crispy golden batter.",
  //     categories: ["Popular", "Crispy"],
  //     price: 55,
  //     avgRating: 4.8,
  //     ratings: [5,5,4,5],
  //     image: "paneer.jpg"

  //   },

  //   {
  //     _id: "2",
  //     name: "Mirchi Bajji",
  //     description: "Hot green chillies stuffed and fried Andhra style.",
  //     categories: ["Spicy", "Popular"],
  //     price: 40,
  //     avgRating: 4.7,
  //     ratings: [5,4,5],
  //     image: "mirchi.jpg"
  //   },

  //   {
  //     _id: "3",
  //     name: "Onion Pakoda",
  //     description: "Crunchy onion pakodas with spicy masala.",
  //     categories: ["Crispy", "Popular"],
  //     price: 35,
  //     avgRating: 4.6,
  //     ratings: [5,4,4],
  //     image: "onionpakoda.jpg"
  //   },

  //   {
  //     _id: "4",
  //     name: "Punugulu",
  //     description: "Soft inside, crispy outside Andhra punugulu.",
  //     categories: ["New", "Popular"],
  //     price: 45,
  //     avgRating: 4.9,
  //     ratings: [5,5,5],
  //     image: "punugulu.jpg"
  //   },

  //   {
  //     _id: "5",
  //     name: "Chicken Biryani",
  //     description: "Hyderabadi dum biryani with rich spices.",
  //     categories: ["Popular", "Spicy"],
  //     price: 199,
  //     avgRating: 4.9,
  //     ratings: [5,5,5],
  //     image: "chickenbiriyani.jpg"
  //   },

  //   {
  //     _id: "6",
  //     name: "Veg Pizza",
  //     description: "Cheesy overloaded veggie pizza.",
  //     categories: ["New", "Crispy"],
  //     price: 149,
  //     avgRating: 4.5,
  //     ratings: [4,5,4],
  //     image: "vegpizza.jpg"
  //   },

  //   {
  //     _id: "7",
  //     name: "Pani Puri",
  //     description: "Crispy pani puri with spicy mint water.",
  //     categories: ["Spicy", "Popular"],
  //     price: 60,
  //     avgRating: 4.8,
  //     ratings: [5,5,4],
  //     image: "panipuri.jpg" 
  //   },

  //   {
  //     _id: "8",
  //     name: "Chocolate Cake",
  //     description: "Rich creamy chocolate delight.",
  //     categories: ["Sweet", "Popular"],
  //     price: 120,
  //     avgRating: 4.9,
  //     ratings: [5,5,5],
  //     image: "chocolatecake.jpg"
  //   },

  //   {
  //     _id: "9",
  //     name: "Vanilla Ice Cream",
  //     description: "Cold creamy vanilla happiness.",
  //     categories: ["Sweet", "New"],
  //     price: 80,
  //     avgRating: 4.7,
  //     ratings: [5,4,5],
  //     image: "vanila.jpg"
  //   },

  //   {
  //     _id: "10",
  //     name: "Masala Bajji",
  //     description: "Spicy masala stuffed crispy bajji.",
  //     categories: ["Spicy", "Crispy"],
  //     price: 50,
  //     avgRating: 4.8,
  //     ratings: [5,5,4],
  //     image: "masalabajji.jpg"
  //   },

  //   {
  //     _id: "11",
  //     name: "Gobi Pakoda",
  //     description: "Golden cauliflower fritters with chutney.",
  //     categories: ["Crispy", "Popular"],
  //     price: 45,
  //     avgRating: 4.6,
  //     ratings: [4,5,4],
  //     image: "gobipakoda.jpg"
  //   },

  //   {
  //     _id: "12",
  //     name: "Mixed Pakoda",
  //     description: "Crunchy medley of vegetables in batter.",
  //     categories: ["Crispy", "New"],
  //     price: 50,
  //     avgRating: 4.7,
  //     ratings: [5,4,5],
  //     image: "mixedpakoda.jpg"
  //   },

  //   {
  //     _id: "13",
  //     name: "Biryani Rice",
  //     description: "Fragrant biryani rice with spices.",
  //     categories: ["Popular", "Spicy"],
  //     price: 180,
  //     avgRating: 4.8,
  //     ratings: [5,5,4],
  //     image: "biriyanirice.jpg"
  //   },

  //   {
  //     _id: "14",
  //     name: "Cheese Pizza",
  //     description: "Double cheese pizza with crispy crust.",
  //     categories: ["Crispy", "New"],
  //     price: 159,
  //     avgRating: 4.7,
  //     ratings: [5,4,5],
  //     image: "cheesepizza.jpg"
  //   },

  //   {
  //     _id: "15",
  //     name: "Pani Puri Spicy",
  //     description: "Extra spicy pani puri variant.",
  //     categories: ["Spicy", "New"],
  //     price: 70,
  //     avgRating: 4.6,
  //     ratings: [4,5,4],
  //     image: "panipurispicy.jpg"
  //   },

  //   {
  //     _id: "16",
  //     name: "Mango Ice Cream",
  //     description: "Creamy mango flavored ice cream.",
  //     categories: ["Sweet", "New"],
  //     price: 90,
  //     avgRating: 4.8,
  //     ratings: [5,5,4],
  //     image: "mangoicecream.jpg"
  //   },

  //   {
  //     _id: "17",
  //     name: "Butterscotch Cake",
  //     description: "Sweet butterscotch layered cake.",
  //     categories: ["Sweet", "Popular"],
  //     price: 130,
  //     avgRating: 4.7,
  //     ratings: [5,4,5],
  //     image: "butterscotchcake.jpg"
  //   },

  //   {
  //     _id: "18",
  //     name: "Strawberry Cake",
  //     description: "Fresh strawberry delight cake.",
  //     categories: ["Sweet", "New"],
  //     price: 140,
  //     avgRating: 4.8,
  //     ratings: [5,5,4],
  //     image: "strawberrycake.jpg"
  //   },

  //   {
  //     _id: "19",
  //     name: "Chocolate Chips Ice Cream",
  //     description: "Ice cream with crunchy chocolate chips.",
  //     categories: ["Sweet"],
  //     price: 100,
  //     avgRating: 4.9,
  //     ratings: [5,5,5],
  //     image: "chocolatechipsicecream.jpg"
  //   },

  //   {
  //     _id: "20",
  //     name: "Tandoori Paneer Pakoda",
  //     description: "Tandoori flavored paneer pakoda.",
  //     categories: ["Spicy", "Crispy"],
  //     price: 65,
  //     avgRating: 4.7,
  //     ratings: [5,4,5],
  //     image: "tandooripaneerpakoda.jpg"
  //   },

  //   {
  //     _id: "21",
  //     name: "Samosa",
  //     description: "Crispy potato and peas samosa.",
  //     categories: ["Popular", "Spicy"],
  //     price: 30,
  //     avgRating: 4.6,
  //     ratings: [4,5,4],
  //     image: "samosa.jpg"
  //   },

  //   {
  //     _id: "22",
  //     name: "Pepperoni Pizza",
  //     description: "Pizza loaded with spicy pepperoni.",
  //     categories: ["Spicy", "New"],
  //     price: 169,
  //     avgRating: 4.8,
  //     ratings: [5,5,4],
  //     image: "pepperonipizza.jpg"
  //   },

  //   {
  //     _id: "23",
  //     name: "Jalebi",
  //     description: "Sweet spirals soaked in syrup.",
  //     categories: ["Sweet", "Popular"],
  //     price: 40,
  //     avgRating: 4.7,
  //     ratings: [5,4,5],
  //     image: "jalebi.jpg"
  //   },

  //   {
  //     _id: "24",
  //     name: "Gulab Jamun",
  //     description: "Soft milk solids in sweet syrup.",
  //     categories: ["Sweet", "New"],
  //     price: 50,
  //     avgRating: 4.8,
  //     ratings: [5,5,4],
  //     image: "gulabjamun.jpg"
  //   }

  // ];

  // Restore local ratings
  let localRatings = JSON.parse(
    localStorage.getItem("localRatings") || "{}"
  );
  
  itemsData.forEach(item => {
    if (localRatings[item._id]) {
      let ratings = localRatings[item._id];
      let sum = ratings.reduce((acc, r) => acc + r.score, 0);
      item.avgRating = sum / ratings.length;
      item.ratings = ratings.map(r => r.score);
    }
  });

  loadRatingsFromStorage();
  renderCategoryBar();

  renderItems(itemsData);
  attachItemEventListeners();

  loadFavoriteHearts();

}

function searchBajji() {
  let searchText = document.getElementById("searchInput")?.value.toLowerCase() || "";
  let filtered = itemsData.filter(item => {
    return [item.name, item.description, item.categories.join(" ")].join(" ").toLowerCase().includes(searchText);
  });
  if (activeFilter && activeFilter !== "All") {
    filtered = filtered.filter(item => item.categories.includes(activeFilter));
  }
  renderItems(filtered);
attachItemEventListeners();

if (searchText.trim() !== "") {

  document
.getElementById("categoryBar")
?.scrollIntoView({
behavior:"smooth",
block:"start"
});
}
}

function addToCart(name, price, img) {

  if (!name || !price) {

    showToast("Invalid item data ❌");

    return;

  }

  let cart =
    JSON.parse(
      localStorage.getItem("cart")
    ) || [];

  let existing =
    cart.find(
      item => item.name === name
    );

  if (existing) {

    existing.qty += 1;

  } else {

    cart.push({
      name,
      price,
      img,
      qty: 1
    });

  }

  localStorage.setItem(
    "cart",
    JSON.stringify(cart)
  );

  updateCartCount();

  showToast(
    `${name} added to cart 🛒`
  );

}

function updateCartCount() {

  let cart =
    JSON.parse(
      localStorage.getItem("cart")
    ) || [];

  let count =
    cart.reduce(
      (sum, item) =>
      sum + item.qty,
      0
    );

  let badge =
    document.getElementById(
      "cartCount"
    );

  let heroCount =
    document.getElementById(
      "cartCountHero"
    );

  if (badge)
    badge.innerText = count;

  if (heroCount)
    heroCount.innerText = count;

}

window.addEventListener(
  "DOMContentLoaded",
  () => {

    updateCartCount();

  }
);

function loadCart() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let container = document.getElementById("cartItems");
  let totalBox = document.getElementById("total");
  if (!container) return;
  container.innerHTML = "";
  if (cart.length === 0) {
    container.innerHTML = `<p class="text-white text-center mt-10">Cart empty 😅</p>`;
    if (totalBox) totalBox.innerHTML = "";
    updateCartCount();
    return;
  }
  let total = 0;
  cart.forEach((item, index) => {
    let itemTotal = item.price * item.qty;
    total += itemTotal;
    container.innerHTML += `
      <div class="bg-orange-100/20 border border-white/10 rounded-3xl p-4 flex flex-col gap-4 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <p class="font-semibold">${item.name}</p>
          <p class="text-sm opacity-80">₹${item.price} × ${item.qty}</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="changeQty(${index}, -1)" class="rounded-full bg-white/10 px-3 py-2">-</button>
          <span class="min-w-[24px] text-center">${item.qty}</span>
          <button onclick="changeQty(${index}, 1)" class="rounded-full bg-white/10 px-3 py-2">+</button>
        </div>
        <div class="text-right">
          <p class="font-semibold">₹${itemTotal}</p>
          <button onclick="removeItem(${index})" class="mt-2 text-sm text-orange-200 hover:text-orange-100">Remove</button>
        </div>
      </div>
    `;
  });
  if (totalBox) totalBox.innerHTML = `<span class="font-semibold">Total:</span> ₹${total}`;
  updateCartCount();
}

function changeQty(index, change) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart[index].qty += change;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  loadCart();
}

function removeItem(index) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  loadCart();
}

function clearCart() {
  localStorage.removeItem("cart");
  loadCart();
  showToast("Cart cleared ✨");
}

function goToPayment() {
  window.location.href = "checkout.html";
}

function showSuccessPopup() {

  console.log("🔥 showSuccessPopup CALLED");

  let popup =
    document.createElement("div");

  popup.innerHTML = `

  <div
  class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">

    <div
    class="rounded-3xl bg-white px-8 py-10 text-center text-slate-900 shadow-2xl">

      <h1
      class="text-3xl font-bold text-green-600">

        ✅ Payment Successful

      </h1>

      <p class="mt-4">

        Order placed successfully.

      </p>

      <p class="mt-2 text-gray-600">

        Preparing your delicious food 🍽️

      </p>

    </div>

  </div>

  `;

  document.body.appendChild(
    popup
  );

  console.trace("POPUP TRACE");

  setTimeout(() => {

    console.log(
      "🔥 REDIRECTING TO ORDER SUCCESS"
    );

    window.location.href =
      "order-success.html";

  }, 1500);

}
function placeOrder() {

  console.log("🔥 PLACE ORDER RUNNING");
  showOrderProcessingScreen();

  let cart =
    JSON.parse(
      localStorage.getItem("cart")
    ) || [];

  if (cart.length === 0) {

    showToast(
      "Cart empty bro 😅"
    );

    return;

  }

  let paymentMethod =
    localStorage.getItem(
      "paymentMethod"
    ) || "Cash on Delivery 💵";

  let total =
    cart.reduce(
      (sum, item) =>
        sum +
        item.price *
        item.qty,
      0
    );

  let formattedDate =
    new Date()
      .toLocaleString(
        "en-IN",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "numeric",
          minute: "numeric"
        }
      );

  fetch(
    `${API_ROOT}/order`,
    {

      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({

        items: cart,

        total,

        time: formattedDate,

        status:
          "Preparing 🍳",

        user:
          localStorage.getItem(
            "userEmail"
          ),

        payment:
          paymentMethod,

        phone: (() => {

          let checkout =
            JSON.parse(
              localStorage.getItem(
                "checkoutInfo"
              ) || "{}"
            );

          return (
            checkout.phone || ""
          );

        })(),

        address: (() => {

          let checkout =
            JSON.parse(
              localStorage.getItem(
                "checkoutInfo"
              ) || "{}"
            );

          let parts = [];

          if (checkout.house)
            parts.push(
              checkout.house
            );

          if (checkout.street)
            parts.push(
              checkout.street
            );

          if (checkout.city)
            parts.push(
              checkout.city
            );

          if (checkout.pincode)
            parts.push(
              checkout.pincode
            );

          return parts.join(
            ", "
          );

        })()

      })

    }
  )

  .then(res => {

    if (!res.ok)
      throw new Error(
        "Order submission failed"
      );

    return res.json();

  })

  .then(data => {

    if (
      !data ||
      !data.message
    ) {

      throw new Error(
        "Invalid response from server"
      );

    }

    localStorage.setItem(
      "latestOrderId",
      data.order._id
    );

    /* ✅ NEW */

    localStorage.setItem(
      "lastOrderTotal",
      total
    );

    localStorage.setItem(
  "lastPaymentMethod",
  paymentMethod
);

/* ✅ COD FIX */

if (
  paymentMethod.includes(
    "Cash"
  )
) {

  localStorage.setItem(
    "paymentId",
    "Cash On Delivery"
  );

}

/* ✅ END FIX */

localStorage.removeItem(
  "cart"
);

    updateCartCount();

   hideOrderProcessingScreen();

showSuccessPopup();

  })

  .catch(err => {

    console.log(
      "Order error:",
      err
    );

    hideOrderProcessingScreen();

showToast(
  "Order failed ❌"
);

  });

}

function loadHistory() {
  let container = document.getElementById("history");
  if (!container) return;
  let currentUser = localStorage.getItem("userEmail");
  let isAdmin = ["admin", "superadmin"].includes(
  localStorage.getItem("userRole")
);
  container.innerHTML = `<p class="text-white text-center mt-10">Loading orders...</p>`;
  fetch(`${API_ROOT}/orders`)
    .then(res => res.json())
    .then(data => {
      container.innerHTML = "";
      if (!data || data.length === 0) {
        container.innerHTML = `<div class="text-center mt-10 text-white"><p class="text-xl">🛒 No orders yet</p><p class="text-sm opacity-70">Start ordering your favorite bajjis 😋</p></div>`;
        return;
      }
      data.reverse().forEach(order => {
        if (!isAdmin && order.user !== currentUser) return;
        let itemsHTML = order.items.map(item => `<p>${item.name} × ${item.qty} - ₹${item.price * item.qty}</p>`).join("");
        let paymentMethod =
  order.payment || "Cash on Delivery 💵";

let amountDisplay =
  paymentMethod.includes("Cash")
    ? "Pay On Delivery"
    : `₹${order.total}`;
let adminExtra = "";

if (isAdmin) {

  adminExtra = `

  <div class="mt-2 text-sm">

    <p class="text-cyan-300">
      👤 Customer:
      ${order.user || "N/A"}
    </p>

    <p class="${
  (
    order.assignedAgentName ||
    order.assignedAgent
  )
    ? 'text-green-300'
    : 'text-red-400'
}">
  🚚 Agent:
  ${
    order.assignedAgentName ||
    order.assignedAgent ||
    "Not Assigned Yet"
  }
</p>
  </div>

  `;

}
        let status = order.status || "Preparing 🍳";
        let oldStatus = localStorage.getItem(order._id);
        if (oldStatus && oldStatus !== status) {
          if (status.includes("On the way") || status.includes("Out For Delivery")) showToast("🚚 Your order is out for delivery!");
          if (status.includes("Delivered")) showToast("✅ Your order has been delivered!");
        }
        localStorage.setItem(order._id, status);
        let statusColor = "text-yellow-300";
        let progress = 33;
        if (status.includes("On the way") || status.includes("Out For Delivery")) { statusColor = "text-blue-300"; progress = 80; }
        if (status.includes("Delivered")) { statusColor = "text-green-400"; progress = 100; }
        let adminControls = "";

if (isAdmin) {

  if (status.includes("Delivered")) {

    adminControls =
    `<p class="text-green-400 mt-3 font-semibold">
      ✔ Order Completed
    </p>`;

  } else {

    adminControls = `

      <div class="mt-3 flex gap-2 flex-wrap">

        <button
        onclick="updateStatus('${order._id}','Out For Delivery 🚚')"
        class="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-sm">

        🚚 Start Delivery

        </button>

        <button
        onclick="sendDeliveryOtp('${order._id}')"
        class="bg-orange-500 hover:bg-orange-600 px-3 py-1 rounded text-sm">

        📧 Send OTP

        </button>

      </div>

      <div class="mt-3 flex gap-2">

        <input
        id="otp-${order._id}"
        placeholder="Enter OTP"
        class="px-3 py-2 rounded text-black">

        <button
        onclick="verifyDeliveryOtp('${order._id}')"
        class="bg-purple-500 hover:bg-purple-600 px-3 py-2 rounded">

        🔐 Verify

        </button>

      </div>

      <button
      id="deliverBtn-${order._id}"
      onclick="markDelivered('${order._id}')"
      class="mt-3 bg-green-500 hover:bg-green-600 px-3 py-2 rounded opacity-50 pointer-events-none">

      ✅ Mark Delivered

      </button>

    `;

  }

}
        container.innerHTML += `
          <div class="bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-3xl mb-4">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h2 class="text-xl font-semibold text-pink-200">Order #${order._id.slice(-6)}</h2>
                <p class="text-sm text-slate-300">
  ${order.time}
</p>

<p class="text-sm text-green-300 mt-1">
  💳 Payment:
  ${paymentMethod}
</p>

<p class="text-sm text-yellow-200">
  💰 Amount:
  ${amountDisplay}
</p>
${adminExtra}

                <div class="mt-2 font-bold ${statusColor}" id="status-${order._id}">${status}</div>
              </div>
             
            </div>
            <div class="w-full bg-white/20 rounded-full h-2 mt-2">
              <div id="progress-${order._id}" class="bg-gradient-to-r from-yellow-400 to-green-400 h-2 rounded-full" style="width: ${progress}%"></div>
            </div>
            <div class="mt-4 text-sm text-slate-200">

  <div class="mb-2 text-cyan-200">
  🆔 Order ID:
  ${order._id}
</div>

<div class="flex gap-2 mb-3 flex-wrap">

  <a
    href="tracking.html?id=${order._id}"
    class="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm font-bold text-white">

    🚚 Track

  </a>

  <a
    href="http://localhost:3000/invoice-pdf/${order._id}"
    target="_blank"
    class="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm font-bold text-white">

    🧾 Invoice

  </a>

</div>

${itemsHTML}
</div>
            ${adminControls}
          </div>
        `;
      });
      setTimeout(refreshStatuses, 5000);
    })
    .catch(err => {
      console.log("History load error:", err);
      container.innerHTML = `<p class="text-red-400">Failed to load orders ❌</p>`;
    });
}

function refreshStatuses() {
  let currentUser = localStorage.getItem("userEmail");
  fetch(`${API_ROOT}/orders`)
    .then(res => res.json())
    .then(data => {
      data.forEach(order => {
        if (order.user !== currentUser) return;
        let statusEl = document.getElementById(`status-${order._id}`);
        let progressEl = document.getElementById(`progress-${order._id}`);
        if (!statusEl || !progressEl) return;
        let status = order.status;
        let color = "text-yellow-300";
        let progress = 33;
        if (status.includes("On the way") || status.includes("Out For Delivery")) { color = "text-blue-300"; progress = 80; }
        if (status.includes("Delivered")) { color = "text-green-400"; progress = 100; }
        let oldStatus = localStorage.getItem(order._id);
        if (oldStatus && oldStatus !== status) {
          if (status.includes("On the way") || status.includes("Out For Delivery")) showToast("🚚 Your order is out for delivery!");
          if (status.includes("Delivered")) showToast("✅ Your order has been delivered!");
        }
        localStorage.setItem(order._id, status);
        statusEl.innerHTML = status;
        statusEl.className = `mt-2 font-bold ${color}`;
        progressEl.style.width = `${progress}%`;
      });
      setTimeout(refreshStatuses, 5000);
    });
}

function updateStatus(id, status) {
  fetch(`${API_ROOT}/order/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, user: localStorage.getItem("userEmail") })
  })
    .then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Update failed");
      }
      showToast("Updated 🔄");
      loadHistory();
    })
    .catch((err) => showToast(err.message || "Error ❌"));
}

function markDelivered(id) {
  fetch(`${API_ROOT}/mark-delivered`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: id,
      user: localStorage.getItem("userEmail")
    })
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Delivery update failed");
      }
      showToast(data.message || "Delivered ✅");
      loadHistory();
    })
    .catch((err) => showToast(err.message || "Delivery update failed ❌"));
}

async function addFavorite(item) {
  let email = localStorage.getItem("userEmail");
  if (!email) {
    showToast("Login first 😅");
    return;
  }
  try {
    await fetch(`${API_ROOT}/favorite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, item })
    });
    showToast("❤️ Added to favorites");
    updateFavoriteCount();
  } catch (err) {
    console.log(err);
    showToast("Failed ❌");
  }
}


async function removeFavorite(item) {

  let email =
    localStorage.getItem(
      "userEmail"
    );

  if (!email) return;

  try {

    await fetch(
      `${API_ROOT}/remove-favorite`,
      {
        method: "POST",
        headers: {
          "Content-Type":
          "application/json"
        },
        body: JSON.stringify({
          email,
          item
        })
      }
    );

    showToast(
      "❤️ Removed from favorites"
    );

    updateFavoriteCount();

    loadFavorites();

  }

  catch (err) {

    console.log(err);

    showToast(
      "Failed ❌"
    );

  }

}
async function loadFavoritesFromBackend() {
  try {
    let email = localStorage.getItem("userEmail");
    if (!email) return;

    let res = await fetch(`${API_ROOT}/favorites/${encodeURIComponent(email)}`);
    if (!res.ok) return;

    let data = await res.json();
    if (!Array.isArray(data)) return;

    localStorage.setItem("favorites", JSON.stringify(data));
    loadFavoriteHearts();
  } catch (err) {
    console.log("Backend favorites sync failed", err);
  }
}


async function loadFavorites() {
  let container = document.getElementById("favorites");
  if (!container) return;
  let email = localStorage.getItem("userEmail");
  try {
    let res = await fetch(`${API_ROOT}/favorites/${encodeURIComponent(email)}`);
    let favorites = await res.json();
    container.innerHTML = "";
    if (!favorites || favorites.length === 0) {
      container.innerHTML = `<p class="text-white text-center mt-10">No favorites yet 😅</p>`;
      return;
    }
    favorites.forEach(item => {
      container.innerHTML += `
        <div class="bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex items-center justify-between">
          <h2 class="text-xl font-semibold text-pink-200">❤️ ${item}</h2>
          <button onclick="removeFavorite('${item.replace(/'/g, "\\'") }')" class="bg-red-500 hover:bg-red-600 px-3 py-2 rounded-2xl text-white">Remove</button>
        </div>
      `;
    });
  } catch (err) {
    console.log(err);
    container.innerHTML = `<p class="text-red-400">Failed to load favorites ❌</p>`;
  }
}

async function toggleFavorite(item, btn) {

  if (!btn) return;

  item = item.trim();

  let favorites = JSON.parse(

    localStorage.getItem("favorites")

    || "[]"

  ).map(fav => fav.trim());

  let isFavorite =
    favorites.includes(item);

  try {

    if (isFavorite) {

      // Remove from UI immediately
      btn.innerText = "🤍";

      // Remove from local storage
      favorites =
        favorites.filter(
          fav => fav !== item
        );

      localStorage.setItem(

        "favorites",

        JSON.stringify(favorites)

      );

      // Try to sync with backend (fire and forget)
      removeFavorite(item).catch(() => {});

      showToast(
        "❌Removed from favorites ❌"
      );

    }

    else {

      // Add to UI immediately
      btn.innerText = "💖";

      favorites.push(item);

      localStorage.setItem(

        "favorites",

        JSON.stringify(favorites)

      );

      // Try to sync with backend (fire and forget)
      addFavorite(item).catch(() => {});

      showToast(
        "✅Added to favorites ❤️"
      );

    }

    updateFavoriteCount();

  }

  catch (err) {

    console.log(err);

    showToast(
      "Favorite failed ❌"
    );

  }

}

async function loadFavoriteHearts() {
  let favorites = JSON.parse(localStorage.getItem("favorites") || "[]").map(fav => fav.trim());
  let favoriteCountEl = document.getElementById("favoriteCount");
  if (favoriteCountEl) favoriteCountEl.innerText = favorites.length;

  itemsData.forEach(food => {
    if (favorites.includes(food.name.trim())) {
      let btn = document.getElementById(`fav-${food._id}`);
      if (btn) btn.innerText = "💖";
    }
  });
}

async function submitRating(itemId, score) {

  let email = localStorage.getItem("userEmail");
  if (!email) {
    showToast("Login before rating");
    return;
  }

  score = parseInt(score);
  if (score < 1 || score > 5) {
    showToast("Invalid rating!");
    return;
  }

  try {
    let res = await fetch(`${API_ROOT}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, email, score })
    });

    let data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Rating failed");
    }

    showToast(`Rated ${score} stars! ⭐`);
    await loadItems();
    attachItemEventListeners();
  } catch (err) {
    console.log("Rating error:", err);
    showToast("Rating failed ❌");
  }
}
function updateItemRatings() {
  let localRatings = JSON.parse(
    localStorage.getItem("localRatings") || "{}"
  );
  
  itemsData.forEach(item => {
    if (localRatings[item._id]) {
      let ratings = localRatings[item._id];
      let sum = ratings.reduce((acc, r) => acc + r.score, 0);
      item.avgRating = sum / ratings.length;
      item.ratings = ratings.map(r => r.score);
    }
  });

  renderItems(itemsData);
  attachItemEventListeners();
}

function loadRatingsFromStorage() {
  let localRatings = JSON.parse(
    localStorage.getItem("localRatings") || "{}"
  );
  
  itemsData.forEach(item => {
    if (localRatings[item._id]) {
      let ratings = localRatings[item._id];
      let sum = ratings.reduce((acc, r) => acc + r.score, 0);
      item.avgRating = sum / ratings.length;
      item.ratings = ratings.map(r => r.score);
    }
  });
}

function showToast(message) {
  let toast = document.createElement("div");
  toast.innerText = message;
  toast.className = "fixed bottom-5 left-1/2 z-50 max-w-xs -translate-x-1/2 rounded-full bg-orange-500 px-5 py-3 text-center text-white shadow-2xl opacity-0 transition-opacity duration-200";
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = "1"; });
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}
function showOrderProcessingScreen() {

  orderProcessing = true;

  const overlay =
    document.createElement("div");

  overlay.id =
    "orderProcessingOverlay";

  overlay.innerHTML = `

  <div
  class="fixed inset-0 bg-black/90 z-[99999] flex items-center justify-center">

    <div class="text-center text-white">

      <div class="text-6xl animate-pulse">
        🍳
      </div>

      <h1 class="text-3xl font-bold mt-4">

        Placing Your Order...

      </h1>

      <p class="mt-3 text-gray-300">

        Please don't refresh or leave this page

      </p>

    </div>

  </div>

  `;

  document.body.appendChild(
    overlay
  );

}
function hideOrderProcessingScreen() {

  orderProcessing = false;

  const overlay =
    document.getElementById(
      "orderProcessingOverlay"
    );

  if (overlay)
    overlay.remove();

}

function updateFavoriteCount() {
  let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  let count = Array.isArray(favorites) ? favorites.length : 0;
  let favoriteCountEl = document.getElementById("favoriteCount");
  if (favoriteCountEl) favoriteCountEl.innerText = count;
}

function toggleBackToTopButton() {
  let button = document.getElementById("backToTop");
  if (!button) return;
  if (window.scrollY > 420) button.classList.remove("hidden");
  else button.classList.add("hidden");
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showAdminModal() {

  if (
    !["admin", "superadmin"].includes(
      localStorage.getItem("userRole")
    )
  ) {
    showToast("Admin only! 🚫");
    return;
  }

  let modal = document.getElementById("adminModal");

  if (modal) {
    loadAdminCategories();

modal.classList.remove("hidden");
   
  }
}

function closeAdminModal() {
  let modal = document.getElementById("adminModal");
  if (modal) modal.classList.add("hidden");
  // Clear inputs
  document.getElementById("adminItemName").value = "";
  document.getElementById("adminItemPrice").value = "";
  document.getElementById("adminItemDesc").value = "";
  document.getElementById("adminItemImage").value = "";
  document.getElementById("adminExistingCategory").value = "";
document.getElementById("adminCustomCategory").value = "";
}

function closeEditModal() {

  document.getElementById(
    "editModal"
  ).classList.add(
    "hidden"
  );

}


function closeDeleteModal() {

  document.getElementById(
    "deleteModal"
  ).classList.add(
    "hidden"
  );

}

async function submitNewItem() {
  
  let email = localStorage.getItem("userEmail");

  if (
    !["admin", "superadmin"].includes(
      localStorage.getItem("userRole")
    )
  ) {
    showToast("Admin only! 🚫");
    return;
  }


  let name = document.getElementById("adminItemName").value.trim();
  let price = Number(document.getElementById("adminItemPrice").value);
  let description = document.getElementById("adminItemDesc").value.trim();
  let existingCategory =
document.getElementById(
"adminExistingCategory"
).value;

let customCategory =
document.getElementById(
"adminCustomCategory"
).value.trim();
  let image = document.getElementById("adminItemImage").value.trim();
const file =
  document.getElementById("adminItemFile").files[0];

if (file) {

  const formData = new FormData();

  formData.append("file", file);

  formData.append(
    "upload_preset",
    "bujji_bajji_uploads"
  );

  const cloudinaryRes =
    await fetch(
      "https://api.cloudinary.com/v1_1/dgsyc8r31/image/upload",
      {
        method: "POST",
        body: formData
      }
    );

  const cloudinaryData =
    await cloudinaryRes.json();

  image =
    cloudinaryData.secure_url;

}
  if (!name || !price || !description || (!existingCategory && !customCategory) || !image) {
    showToast("Fill all fields! 📝");
    return;
  }

  let categories = [];

if (existingCategory) {
  categories.push(existingCategory);
}

if (customCategory) {
  categories.push(customCategory);
}

  try {
    let res = await fetch(`${API_ROOT}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, price, description, categories, image })
    });

    if (res.ok) {
      showToast("✅ Item added! Will display for 1 minute");
      closeAdminModal();
      await loadItems();
    } else {
      let data = await res.json();
      showToast(data.message || "Error adding item");
    }
  } catch (err) {
    console.log(err);
    showToast("Failed to add item ❌");
  }
}

function loadAdminCategories() {

  let select =
    document.getElementById(
      "adminExistingCategory"
    );

  if (!select) return;

  let categories =
    [...new Set(
      itemsData.flatMap(
        item => item.categories
      )
    )];

  select.innerHTML =
    '<option value="">Select Existing Category</option>';

  categories.forEach(cat => {

    select.innerHTML +=
      `<option value="${cat}">
        ${cat}
      </option>`;

  });

}

async function initializeHome() {
  protectPage();
  await fetchUserProfile();
  updateAccountUI();
  await loadItems();
  await loadFavoritesFromBackend();

  let email = localStorage.getItem("userEmail");
 if (
  ["admin", "superadmin"].includes(
    localStorage.getItem("userRole")
  )
) {
    setTimeout(() => {
      let categoryBar = document.getElementById("categoryBar");
      if (categoryBar && !document.getElementById("adminAddBtn")) {
        let addBtn = document.createElement("button");
        addBtn.id = "adminAddBtn";
        addBtn.innerHTML = "➕ Add Item";
        addBtn.className = "rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-300 transition hover:bg-green-500/50 border border-green-500/50";
        addBtn.onclick = showAdminModal;
        categoryBar.insertBefore(addBtn, categoryBar.firstChild);
      }
    }, 500);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("itemGrid")) {
    initializeHome();
  } else {
    protectPage();
    updateAccountUI();
    updateCartCount();
    loadFavoriteHearts();
  }
  toggleBackToTopButton();
  window.addEventListener("scroll", toggleBackToTopButton);
  document.addEventListener("click", hideAccountMenuOnClickOutside);
});


let saveEditBtn =
  document.getElementById(
    "saveEditBtn"
  );

if (saveEditBtn) {

  saveEditBtn.addEventListener(  
  "click",
  async () => {

    let itemId =
      document.getElementById(
        "editItemId"
      ).value;

    let name =
      document.getElementById(
        "editItemName"
      ).value;

    let price =
      document.getElementById(
        "editItemPrice"
      ).value;

    let description =
      document.getElementById(
        "editItemDescription"
      ).value;

    try {

      let res =
        await fetch(
          `${API_ROOT}/edit-item/${itemId}`,
          {
            method:"PUT",

            headers:{
              "Content-Type":
              "application/json"
            },

            body:JSON.stringify({

              email:
              localStorage.getItem(
                "userEmail"
              ),

              name,
              price,
              description

            })

          }
        );

      let data =
        await res.json();

      showToast(
        data.message
      );

      closeEditModal();

      loadItems();

    } catch(err) {

      console.log(err);

    }

  }
);
}


let confirmDeleteBtn =
  document.getElementById(
    "confirmDeleteBtn"
  );

if (confirmDeleteBtn) {

  confirmDeleteBtn.addEventListener(

  "click",
  async () => {

    let itemId =
      document.getElementById(
        "deleteItemId"
      ).value;

    try {

      let res =
        await fetch(
          `${API_ROOT}/delete-item/${itemId}`,
          {
            method:"DELETE",

            headers:{
              "Content-Type":
              "application/json"
            },

            body:JSON.stringify({

              email:
              localStorage.getItem(
                "userEmail"
              )

            })

          }
        );

      let data =
        await res.json();

      showToast(
        data.message
      );

      closeDeleteModal();

      loadItems();

    } catch(err) {

      console.log(err);

    }

  }
);
}

async function sendDeliveryOtp(orderId){

  try{

    const res =
    await fetch(
      `${API_ROOT}/send-delivery-otp`,
      {
        method:"POST",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify({
          orderId,
          user: localStorage.getItem("userEmail")
        })
      }
    );

    const data =
    await res.json();

    showToast(
      data.message ||
      "OTP Sent"
    );

  }

  catch(err){

    console.log(err);

    showToast(
      "OTP Send Failed ❌"
    );

  }

}

async function verifyDeliveryOtp(orderId){

  try{

    const otp =
    document.getElementById(
      `otp-${orderId}`
    ).value;

    const res =
    await fetch(
      `${API_ROOT}/verify-delivery-otp`,
      {
        method:"POST",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify({
          orderId,
          otp,
          user: localStorage.getItem("userEmail")
        })
      }
    );

    const data =
    await res.json();

    if(data.success){

      showToast(
        "OTP Verified ✅"
      );

      document.getElementById(
        `deliverBtn-${orderId}`
      ).classList.remove(
        "opacity-50",
        "pointer-events-none"
      );

    }

    else{

      showToast(
        "Invalid OTP ❌"
      );

    }

  }

  catch(err){

    console.log(err);

    showToast(
      "Verification Failed ❌"
    );

  }

}
window.addEventListener(
  "beforeunload",
  function (e) {

    if (orderProcessing) {

      e.preventDefault();

      e.returnValue =
        "";

    }

  }
);


