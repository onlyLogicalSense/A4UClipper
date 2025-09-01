console.log("✅ inject.js loaded");

function getBaseUrlAndStoreId(hostname) {
    const storeId = getStoreIdFromCookie();
    if (hostname.includes("acme"))
        return ["https://www.acmemarkets.com", storeId];
    if (hostname.includes("kings"))
        return ["https://www.kingsfoodmarkets.com", storeId];
	if (hostname.includes("jewelosco"))
        return ["https://www.jewelosco.com", storeId];
	if (hostname.includes("safeway"))
        return ["https://www.safeway.com", storeId];
	if (hostname.includes("vons"))
        return ["https://www.vons.com", storeId];
	if (hostname.includes("tomthumb"))
        return ["https://www.tomthumb.com", storeId];
	if (hostname.includes("albertsons"))
        return ["https://www.albertsons.com", storeId];
    return [null, null];
}

function getStoreIdFromCookie() {
    const match = document.cookie.match(/SWY_SYND_USER_INFO=([^;]+)/);
    if (match) {
        try {
            const decoded = decodeURIComponent(match[1]);
            const data = JSON.parse(decoded);
            return data.storeId;
        } catch (e) {
            console.error("Failed to parse SWY_SYND_USER_INFO:", e);
        }
    }
    return null;
}

function showProgressBar(total) {
    const container = document.createElement("div");
    container.id = "clip-progress-container";
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100%";
    container.style.height = "30px";
    container.style.backgroundColor = "#eee";
    container.style.zIndex = "10001";
    container.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
    container.style.fontFamily = "Arial, sans-serif";

    const bar = document.createElement("div");
    bar.id = "clip-progress-bar";
    bar.style.height = "100%";
    bar.style.width = "0%";
    bar.style.backgroundColor = "#4CAF50";
    bar.style.transition = "width 0.3s";

    const label = document.createElement("span");
    label.id = "clip-progress-label";
    label.style.position = "absolute";
    label.style.left = "50%";
    label.style.top = "50%";
    label.style.transform = "translate(-50%, -50%)";
    label.style.color = "black";
    label.style.fontWeight = "bold";
    label.style.fontSize = "14px";

    container.appendChild(bar);
    container.appendChild(label);
    document.body.appendChild(container);

    return {
        update: (current) => {
            const percent = Math.round((current / total) * 100);
            bar.style.width = `${percent}%`;
            label.textContent = `Clipping Coupons: ${current}/${total}`;
        },
        remove: () => {
            container.remove();
        }
    };
}

function removeProgressBar() {
    const container = document.getElementById("clipProgressContainer");
    if (container)
        container.remove();
}

async function getCookieHeader() {
    return new Promise((resolve, reject) => {
        window.postMessage({
            type: "GET_COOKIES_REQUEST"
        }, "*");
        function handleResponse(event) {
            if (event.source !== window || event.data.type !== "GET_COOKIES_RESPONSE")
                return;
            window.removeEventListener("message", handleResponse);
            resolve(event.data.cookieHeader);
        }
        window.addEventListener("message", handleResponse);
        setTimeout(() => reject(new Error("Timeout waiting for cookie response")), 2000);
    });
}

async function fetchOffers(baseUrl, storeId) {
    const galleryUrl = `${baseUrl}/abs/pub/xapi/offers/companiongalleryoffer?storeId=${storeId}&page=1&pagesize=500`;
    const res = await fetch(galleryUrl, {
        method: "GET",
        credentials: "include",
        headers: {
            "accept": "application/json",
            "content-type": "application/vnd.safeway.v2+json",
            "x-swy-application-type": "web",
            "x-swy_api_key": "emjou",
            "x-swy_banner": "acmemarkets",
            "x-swy_version": "1.1",
        },
    });
    return res.json();
}

async function clipCoupons(baseUrl, storeId, offersToClip, cookieHeader) {
    const clipUrl = `${baseUrl}/abs/pub/web/j4u/api/offers/clip?storeId=${storeId}`;
    
	const progress = showProgressBar(offersToClip.length);

    for (let i = 0; i < offersToClip.length; i++) {
        const offer = offersToClip[i];
        const payload = {
            items: [{
                    clipType: "C",
                    itemId: offer.offerId,
                    itemType: offer.offerPgm
                }, {
                    clipType: "L",
                    itemId: offer.offerId,
                    itemType: offer.offerPgm
                },
            ],
        };
        await fetch(clipUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Cookie": cookieHeader,
            },
            body: JSON.stringify(payload),
        });
    
		progress.update(i + 1);
    }

	progress.remove();
}

function createTestButton() {
    const btn = document.createElement("button");
    btn.textContent = "Clip All Coupons";
    btn.style.position = "fixed";
    btn.style.bottom = "20px";
    btn.style.right = "20px";
    btn.style.zIndex = 10000;
    btn.style.padding = "12px 20px";
    btn.style.backgroundColor = "#4CAF50";
    btn.style.color = "white";
    btn.style.border = "none";
    btn.style.borderRadius = "8px";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "14px";

    btn.addEventListener("click", async() => {
        alert("Starting coupon clipping...");

        const [baseUrl, storeId] = getBaseUrlAndStoreId(window.location.hostname);
		if (!baseUrl) {
            alert("❌ Unable to determine base URL.");
            return;
        }
		if ( !storeId) {
            alert("❌ Unable to determine store ID.");
            return;
        }

        const offersData = await fetchOffers(baseUrl, storeId);
        const companionOffers = offersData?.companionGalleryOffer;

        if (!companionOffers || typeof companionOffers !== "object") {
            alert("❌ Failed to load offers. Please make sure you're logged in.");
            return;
        }

        const offersList = Object.values(companionOffers);
        const offersToClip = offersList.filter(o => o.status === "U");

        if (!offersToClip.length) {
            alert("✅ No unclipped coupons found!");
            return;
        }

        const cookieHeader = await getCookieHeader();
        await clipCoupons(baseUrl, storeId, offersToClip, cookieHeader);

        alert("✅ Done clipping!");
        localStorage.clear();
        sessionStorage.clear();
        setTimeout(() => {
            location.href = location.href;
        }, 1000);
    });

    document.body.appendChild(btn);
}

createTestButton();

