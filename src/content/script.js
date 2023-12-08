const BASE = '' // replace with '' if deploying


let collectionName, collectionDescription, supply, IPFSAddress, appFeeAddress, appFee, fileFormat;
let isFreeMint = true;
let verifyUrl = 'https://api2.ordinalsbot.com/search?hash='


collectionName = document.querySelector('script[n]').getAttribute('n').split(',');
collectionDescription = document.querySelector('script[d]').getAttribute('d').split(',').join(' ');
supply = document.querySelector('script[s]').getAttribute('s').split(',');
IPFSAddress = document.querySelector('script[ipfs]').getAttribute('ipfs').split(',');
fileFormat = document.querySelector('script[format]')?.getAttribute('format').split(',').join(' ') || 'png';

appFeeAddress = document.querySelector('script[a]') && document.querySelector('script[a]').getAttribute('a') ? document.querySelector('script[a]').getAttribute('a').split(',')[0] : null;
appFee = document.querySelector('script[f]') ? parseFloat(document.querySelector('script[f]').getAttribute('f')) : 0;

// Check if appFeeAddress is not null and appFee is greater than 0
if (appFeeAddress !== null && appFee > 0) {
    isFreeMint = false;
}

window.isFreeMint = isFreeMint;

let imagesPerPage = 30;
let currentPage = 1;
let totalPages = Math.ceil(supply / imagesPerPage);
let ipfsGateway = 'ipfs:/';
let currentAssetId = null;
let currentBlob, currentBase64data;
let currentImageType = 'image/' + fileFormat;

window.currentBase64data;

window.addEventListener('message', event => {
    if (event.source == window && event.data.type && (event.data.type == 'SET_BASE64_DATA')) {
        window.currentBase64data = event.data.base64data;
    }
});

function loadImagesForCurrentPage() {
    const gallery = document.getElementById('image-gallery');
    gallery.innerHTML = ''; 
    let startImage = (currentPage - 1) * imagesPerPage;
    let endImage = startImage + imagesPerPage;
    for (let i = startImage + 1; i <= endImage && i <= supply; i++) {
        let img = document.createElement('img');
        img.src = `${ipfsGateway}/${IPFSAddress}/${i}.${fileFormat}`;
        img.alt = 'IPFS Image ' + i;
        img.style.width = '100%';
        img.style.imageRendering = 'pixelated';
        img.dataset.src = img.src;
        img.onclick = function() {
            showModal(this);
        };
        gallery.appendChild(img);
    }
}

function changePage(increment) {
    currentPage += increment;
    currentPage = Math.max(1, Math.min(currentPage, totalPages));
    loadImagesForCurrentPage();
    document.getElementById('page-indicator').innerText = 'Page ' + currentPage + ' of ' + totalPages;
}

function searchImage() {
    const searchBox = document.getElementById('search-box');
    const searchQuery = parseInt(searchBox.value);
    if (searchQuery >= 1 && searchQuery <= supply) {
        const gallery = document.getElementById('image-gallery');
        gallery.innerHTML = ''; // Clear existing images
        let img = document.createElement('img');
        img.src = `${ipfsGateway}/${IPFSAddress}/${searchQuery}.${fileFormat}`;
        img.alt = 'IPFS Image ' + searchQuery;
        img.style.width = '100%';
        img.style.imageRendering = 'pixelated';
        img.onclick = function() {
            showModal(this);
        };
        gallery.appendChild(img);
    }
}

function goToPage() {
    let pageNumber = document.getElementById('page-number').value;
    currentPage = parseInt(pageNumber, 10);
    loadImagesForCurrentPage();
    updatePageIndicator(); // Add this function if it doesn't exist
}

function updatePageIndicator() {
    document.getElementById('page-indicator').innerText = 'Page ' + currentPage + ' of ' + totalPages;
}


function showModal(image) {
    currentAssetId = image.alt.split(' ')[2];
    let modal = document.getElementById('image-modal');
    let modalImgContainer = document.getElementById('modal-image-container'); // Create a container for the modal image if not already present.
    let captionText = document.getElementById('image-id');
    let verifyButton = document.getElementById('verify-button');

    modalImgContainer.innerHTML = '';

    // Clone the image and append to the modal
    let clonedImage = image.cloneNode(true);
    const srcParts = clonedImage.src.split('/');
    const imgId = srcParts[srcParts.length - 1]
    clonedImage.src = `${ipfsGateway}/${IPFSAddress}/${imgId}`;

    // clonedImage.style.width = '100%'; // Set any specific styles for the modal image
    modalImgContainer.appendChild(clonedImage);

    modal.style.display = "block";
    // modalImg.src = image.src;
    // modalImg.src = image.dataset.src;

    let mintStatusText = isFreeMint ? '<span class="free-mint">FREE MINT</span>' : `<span class="mint-price">${appFee} sats</span>`;
    captionText.innerHTML = `<span class="asset-id">ID: ${currentAssetId}</span> ${mintStatusText}`;

}

function loadScript(url, isModule = false) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        if (isModule) {
            script.type = 'module';
        }
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}


async function getSHA256Checksum(base64String) {
    // Pad the string if necessary
    base64String = base64String.padEnd(Math.ceil(base64String.length / 4) * 4, '=');

    // Convert Base64 to Uint8Array
    const raw = window.atob(base64String);
    const rawLength = raw.length;
    const array = new Uint8Array(new ArrayBuffer(rawLength));

    for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }

    // Compute the SHA256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', array);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // Convert the hash to a hexadecimal string
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


function createToken(e) {
    return `${btoa(JSON.stringify({alg:"none",typ:"JWT"}))}.${btoa(JSON.stringify(e))}.`
}

function inscribeAsset() {
    console.log('Inscribing asset');

    if (!window.currentBase64data) {
        console.error('No image data available for inscription.');
        document.getElementById("status").innerHTML = "No image data available. Please try again.";
        return;
    }

    const encodedData = window.currentBase64data.split(',')[1];
    const imageType = window.currentBase64data.split(',')[0].split(';')[0].split(':')[1]

    if (window.BitcoinProvider) {
        let t = createToken({
            network: {
                type: "Mainnet"
            },
            contentType: imageType,
            content: encodedData,
            payloadType: "BASE_64"
        });

        // Conditionally add optional parameters if isFreeMint is false
        if (!isFreeMint && appFeeAddress !== null && appFee > 0) {
            t = createToken({
                network: {
                    type: "Mainnet"
                },
                contentType: imageType,
                content: encodedData,
                payloadType: "BASE_64",
                appFeeAddress: appFeeAddress, // the address where the inscription fee should go
                appFee: appFee // the amount of sats that should be sent to the fee address
            });
        }

        connection = window.BitcoinProvider.createInscription(t);
    } else {
        document.getElementById("status").innerHTML = "Xverse could not be found.. 🙈";
    }
}

function verifyAsset() {
    console.log('Verifying asset');
    let modal = document.getElementById('image-modal');

    if (!window.currentBase64data) {
        console.error('No image data available for inscription.');
        document.getElementById("status").innerHTML = "No image data available. Please try again.";
        return;
    }
    const encodedData = window.currentBase64data.split(',')[1];

    getSHA256Checksum(encodedData).then(hashHex => {
        let hashDisplay = document.getElementById('hash-display');
        if (!hashDisplay) {
            hashDisplay = document.createElement('div');
            hashDisplay.id = 'hash-display';
            modal.appendChild(hashDisplay); // Append it where you want in the modal
        }
        hashDisplay.style.display = "block";
        hashDisplay.textContent = "SHA256: " + hashHex;

        window.open(`${window.verifyUrl}${hashHex}`, '_blank');
    });

}

function closeModal() {
    let modal = document.getElementById('image-modal');
    modal.style.display = "none";
    let hashDisplay = document.getElementById('hash-display');
    if (hashDisplay) {
        hashDisplay.style.display = "none";
    }
    window.currentBase64data = null;
}

function setupPageInput() {
    // document.getElementById('page-number').max = totalPages;
    document.getElementById('total-supply').textContent = supply;
}

function loadStyleSheet() {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${BASE}/content/e69e980a39eae520c0cf41a4eb1b18bc318ed0ebd56eb87f316823f598cac70ci0`; // a44a4e12c96e02189d120cd3a660954e0e702f51904413df34ce4ae13befc1adi0 // e69e980a39eae520c0cf41a4eb1b18bc318ed0ebd56eb87f316823f598cac70ci0
    document.head.appendChild(link);
}

function convertTextToHTML(text) {
    if (typeof text === 'string' || text instanceof String) {
        // Convert URLs to links with a CSS class
        return text
            .replace(/(https?:\/\/[^\s]+)/g, (url) => `<a href="${url}" target="_blank" class="custom-link">${url}</a>`)
            .replace(/\\n/g, '<br>');
    } else {
        console.error('Expected a string for convertTextToHTML, received:', typeof text);
        return '';
    }
}

function changeVerifyUrl() {
    const defaultUrl = window.verifyUrl;
    let newUrl = prompt("Enter the new verify URL or leave blank for the default:", defaultUrl);
    if (newUrl === null || newUrl.trim() === '') {
        newUrl = defaultUrl; // Use the default URL if the input is empty or cancelled
    }
    // Update the verify URL
    window.verifyUrl = newUrl;
    console.log("Verify URL changed to:", window.verifyUrl);
}


function openTosModal() {
    fetch(`${BASE}/content/b400fa11332a95b434e7be5a008849220d85ee2ad8985d010a18a77dff2a2203i0`) // ab91754d05c4e22b4a55ff362f0bdddcd760dfceb70a7685df38daa974f7b35ci0 // b400fa11332a95b434e7be5a008849220d85ee2ad8985d010a18a77dff2a2203i0
        .then(response => response.text())
        .then(data => {
            const actualTos = document.getElementById('actual-tos');
            if (actualTos) {
                actualTos.innerHTML = data;
                document.getElementById('tos-modal').style.display = 'block';
            } else {
                console.error('ToS content element not found');
            }
        })
        .catch(error => console.error('Error loading TOS:', error));
}


function closeTosModal() {
    document.getElementById('tos-modal').style.display = 'none';
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show confirmation message
        const confirmationMsg = document.getElementById('copy-confirmation');
        confirmationMsg.style.display = 'inline';

        // Hide the confirmation message after 2 seconds
        setTimeout(() => {
            confirmationMsg.style.display = 'none';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}



function createPageStructure() {
    document.title = collectionName;
    document.body.style.margin = '0px';
    document.body.style.padding = '0px';
    const body = document.body;


    // Create header
    const header = document.createElement('header');
    header.innerHTML = `
        <h1>${collectionName}</h1>
        <p>${convertTextToHTML(collectionDescription)}</p>
        <div class="stats-container">
            <div class="stat-card">
                <div class="stat-title">SUPPLY</div>
                <div class="stat-value" id="total-supply"></div>
            </div>
            <div class="stat-card">
                <div class="stat-title">MINT PRICE</div>
                <div class="stat-value">${isFreeMint ? '<span class="free-mint">FREE MINT</span>' : `<span class="mint-price">${appFee} sats</span>`}</div>
            </div>
        </div>
        <div class="search-container">
            <input type="text" id="search-box" placeholder="Enter image ID..." oninput="searchImage()">
            <button onclick="searchImage()">Search</button>
            <input type="number" id="page-number" placeholder="Go to page..." min="1">
            <button onclick="goToPage()">Go</button>
        </div>`;
    body.appendChild(header);

    const configIcon = document.createElement('div');
    configIcon.id = 'config-icon';
    configIcon.className = 'config-icon';
    configIcon.innerHTML = '&#9881;'; 
    configIcon.onclick = changeVerifyUrl;
    header.appendChild(configIcon);

    // Create "?" Help Icon
    const helpIcon = document.createElement('div');
    helpIcon.id = 'help-icon';
    helpIcon.className = 'help-icon';
    helpIcon.textContent = 'Help & ToS';
    helpIcon.onclick = openTosModal;
    header.appendChild(helpIcon);

    loadStyleSheet()

    // Create image gallery
    const imageGallery = document.createElement('div');
    imageGallery.id = 'image-gallery';
    imageGallery.className = 'gallery';
    body.appendChild(imageGallery);

    // Create pagination
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    pagination.innerHTML = `
        <button id="prev-page" onclick="changePage(-1)">Previous</button>
        <span id="page-indicator">Page 1 of X</span>
        <button id="next-page" onclick="changePage(1)">Next</button>`;
    body.appendChild(pagination);

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'image-modal';
    modal.className = 'modal';
    modal.style.display = 'none';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <div id="modal-image-container"></div>
            <div class="caption">
                <p id="image-id"></p>
                <div class="button-group">
                    <button class="action-button" id="verify-button" onclick="verifyAsset()">Verify</button>
                    <button class="action-button" id="inscribe-button" onclick="inscribeAsset()">Inscribe</button>   
                </div>
                <p class="disclaimer">
                    Before inscribing, confirm that there are no previous inscriptions or pending transactions for this asset in the mempool
                    <br><br>
                    Use the 'Verify' button to check for confirmed inscriptions. A positive result means a confirmed inscription exists, but DOES NOT EXCLUDE unconfirmed mempool inscriptions.
                    <br><br>
                    Inscribing acknowledges the risk of spending funds on a potentially worthless asset.
                </p>
            </div>
        </div>`;
    body.appendChild(modal);


    const tosModal = document.createElement('div');
    tosModal.id = 'tos-modal';
    tosModal.className = 'modal';
    tosModal.style.display = 'none';
    tosModal.innerHTML = `
            <div class="modal-content tos-modal-content">
            <span class="close" onclick="closeTosModal()">&times;</span>
            <div id="tos-content">
                <h1>About the Ordinals Launcher</h1>

                <p>
                    The Permissionless Ordinals Launcher assists in launching Ordinals collections. It simplifies uploading assets to IPFS and handling inscriptions.
                </p>

                <p>
                    For optimal performance, install the <a href="https://github.com/jerryfane/inscription-helper" class="custom-link" target="_blank">Inscription Helper</a> browser extension.
                </p>

                <p>
                    The Launcher's source code is open-source. Find it, along with a usage tutorial, at: <a href="https://github.com/jerryfane/ord-launcher" class="custom-link" target="_blank">Ordinals Launcher GitHub</a>.
                </p>

                <p class="highlighted">
                    Prior to any use this tool, please review the Terms of Service. Note the risk of inscribing potentially valueless digital assets.
                </p>

                <p class="highlighted">
                    Support for this project can be provided via Bitcoin donations at: 
                    <strong id="btc-address" onclick="copyToClipboard('bc1pk5wln2zvku0gj6mh9lfzvvn8ucnmk5r4lyl78q5g7zsf7cu07avql6rr7q')">
                        bc1pk5wln2zvku0gj6mh9lfzvvn8ucnmk5r4lyl78q5g7zsf7cu07avql6rr7q
                    </strong>
                    <span id="copy-confirmation" style="display:none; color: white;">Copied!</span>
                </p>


                <br><hr><br>
                <div id="actual-tos"></div>
            </div>
        </div>
        `;
    document.body.appendChild(tosModal);

}

function checkForExtension() {
    if (!window.InscriptionHelperPresent) {
        alert('The Inscription Helper Extension is not present. Please install the extension for the webpage to load correctly.');
    }
}

async function loadAllScripts() {
    await loadScript(`${BASE}/content/66979aec90e592bc5be7fddcef23daeff982662b7225e7804c1b271f1b0d267ai0`); // crypto-js  // a4aff0779fb5fc679e80ea03e7dea58ef1e509d274b38bef8575af803db4251bi0 // 66979aec90e592bc5be7fddcef23daeff982662b7225e7804c1b271f1b0d267ai0
}

function runCompiler() {
    loadAllScripts().catch(err => {
        console.error('Error loading scripts:', err);
    });

    window.verifyUrl = verifyUrl;

    checkForExtension()
    createPageStructure()
    loadImagesForCurrentPage();
    document.getElementById('total-supply').innerText = supply;
    setupPageInput()
}

if (document.readyState === 'complete') {
    // console.log("Executing immediately because page is already loaded.");
    runCompiler();
} else {
    console.log("Waiting for page to load...");
    window.addEventListener('load', runCompiler);
}