const urlList = document.getElementById("url-list");
const input = document.getElementById("url-input");
const addBtn = document.getElementById("add-url");

// Use local for broader browser support
const storage = (typeof browser !== "undefined" ? browser?.storage?.local : chrome?.storage?.local);

function renderList(urls) {
    urlList.innerHTML = "";
    urls.forEach((url, index) => {
        const li = document.createElement("li");
        li.textContent = url;
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.className = "del-btn";
        delBtn.onclick = () => {
            urls.splice(index, 1);
            storage.set({ urlPatterns: urls }, () => renderList(urls));
        };
        li.appendChild(delBtn);
        urlList.appendChild(li);
    });
}

// Load stored URLs
storage.get({ urlPatterns: [] }, ({ urlPatterns }) => {
    renderList(urlPatterns);
});

addBtn.addEventListener("click", () => {
    const newUrl = getBaseUrl(input.value.trim());

    if (!newUrl) return;

    storage.get({ urlPatterns: [] }, ({ urlPatterns }) => {
        if (!urlPatterns.includes(newUrl)) {
            urlPatterns.push(newUrl);
            storage.set({ urlPatterns }, () => {
                renderList(urlPatterns);
                input.value = "";
            });
        }
    });
});

function getBaseUrl(url) {
    if (!url) return null;

    try {
        const u = new URL(url);
        return `${u.protocol}//${u.hostname}`;
    } catch (e) {
        return null;
    }
}