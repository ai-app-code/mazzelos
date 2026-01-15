/**
 * Mazzel OS Nesting Engine v2.0
 * Implements Guillotine Packing Algorithm for Panel Saws
 * Features: SVG visualization, part labels, color coding, waste display
 */

// ========== COLOR PALETTE ==========
const PART_COLORS = {
    'cabinet': '#8B5CF6',  // Mor - Gövde
    'door': '#10B981',     // Yeşil - Kapak
    'drawer': '#F59E0B',   // Turuncu - Çekmece
    'back': '#3B82F6',     // Mavi - Arkalık
    'custom': '#EC4899',   // Pembe - Özel
    'default': '#6366F1'   // İndigo - Varsayılan
};

// ========== GUILLOTINE PACKER ==========
class GuillotinePacker {
    constructor(width, height) {
        this.binWidth = width;
        this.binHeight = height;
        this.freeRectangles = [{ x: 0, y: 0, w: width, h: height }];
        this.usedRectangles = [];
    }

    fit(blocks) {
        // Sort blocks by area descending (larger first)
        blocks.sort((a, b) => (b.w * b.h) - (a.w * a.h));

        blocks.forEach(block => {
            let node = this.findBestNode(block.w, block.h);
            if (node) {
                this.placeBlock(block, node);
            } else {
                // Try rotating
                node = this.findBestNode(block.h, block.w);
                if (node && !block.pattern) { // Don't rotate if pattern matters
                    block.rotated = true;
                    let tmp = block.w; block.w = block.h; block.h = tmp;
                    this.placeBlock(block, node);
                } else {
                    block.fit = null; // Could not fit
                }
            }
        });
    }

    findBestNode(w, h) {
        // Best Area Fit (BAF) - Find the smallest area that fits
        let bestNode = null;
        let bestAreaFit = Infinity;

        for (let i = 0; i < this.freeRectangles.length; i++) {
            let r = this.freeRectangles[i];
            if (w <= r.w && h <= r.h) {
                let areaFit = (r.w * r.h) - (w * h);
                if (areaFit < bestAreaFit) {
                    bestAreaFit = areaFit;
                    bestNode = r;
                }
            }
        }
        return bestNode;
    }

    placeBlock(block, freeRect) {
        let placedRect = {
            x: freeRect.x,
            y: freeRect.y,
            w: block.w,
            h: block.h,
            id: block.id,
            // Extended info for labeling
            moduleName: block.moduleName || '',
            partName: block.partName || block.id,
            partType: block.partType || 'cabinet',
            realW: block.realW || block.w,
            realH: block.realH || block.h,
            edgeBanding: block.edgeBanding || '',
            rotated: block.rotated || false
        };
        this.usedRectangles.push(placedRect);

        // Remove the utilized freeRect
        const index = this.freeRectangles.indexOf(freeRect);
        this.freeRectangles.splice(index, 1);

        // Create new free rects (Guillotine Split)
        const right = {
            x: placedRect.x + placedRect.w,
            y: placedRect.y,
            w: freeRect.w - placedRect.w,
            h: freeRect.h
        };

        const bottom = {
            x: placedRect.x,
            y: placedRect.y + placedRect.h,
            w: placedRect.w,
            h: freeRect.h - placedRect.h
        };

        if (right.w > 0 && right.h > 0) this.freeRectangles.push(right);
        if (bottom.w > 0 && bottom.h > 0) this.freeRectangles.push(bottom);

        // Sort free rectangles by area (smaller first for better fit)
        this.freeRectangles.sort((a, b) => (a.w * a.h) - (b.w * b.h));
    }

    getWasteRectangles() {
        return this.freeRectangles.filter(r => r.w > 50 && r.h > 50);
    }
}

// ========== UI LOGIC ==========
document.addEventListener('DOMContentLoaded', () => {
    initNesting();
});

function initNesting() {
    const calcBtn = document.querySelector('#calculateBtn');
    if (calcBtn) {
        calcBtn.addEventListener('click', runOptimization);
    }
}

// ========== COLLECT PARTS FROM MODULES ==========
function collectPartsFromModules() {
    const moduleCards = document.querySelectorAll('.module-card');
    let parts = [];

    moduleCards.forEach(card => {
        const moduleName = card.querySelector('.module-name-input')?.value || 'Modül';
        const rows = card.querySelectorAll('tbody tr');

        rows.forEach(row => {
            const partType = row.querySelector('.p-group')?.value || 'cabinet';
            const partNameDropdown = row.querySelector('.p-type')?.value || '';
            const customName = row.querySelector('.custom-part-name')?.value || '';
            const partName = customName || partNameDropdown;

            const length = parseFloat(row.querySelector('.part-l')?.value) || 0;
            const width = parseFloat(row.querySelector('.part-w')?.value) || 0;
            const qty = parseInt(row.querySelector('.part-qty')?.value) || 1;
            const materialId = row.querySelector('.part-material')?.value || '';
            const pattern = row.querySelector('.pattern-toggle')?.classList.contains('active') || false;

            // Get edge banding info
            const smartRule = row.querySelector('.smart-rule')?.value || '';

            if (length > 0 && width > 0) {
                parts.push({
                    moduleName,
                    partName,
                    partType,
                    length,
                    width,
                    qty,
                    materialId,
                    pattern,
                    edgeBanding: smartRule
                });
            }
        });
    });

    return parts;
}

// ========== RUN OPTIMIZATION ==========
function runOptimization() {
    // 1. Get Board Size
    const boardW = parseFloat(document.getElementById('sheetWidth')?.value) || 1830;
    const boardH = parseFloat(document.getElementById('sheetHeight')?.value) || 2800;
    const kerf = parseFloat(document.getElementById('kerfWidth')?.value) || 4;
    const edgeTrim = parseFloat(document.getElementById('edgeTrim')?.value) || 10;

    // Effective board size after edge trimming
    const effectiveW = boardW - (edgeTrim * 2);
    const effectiveH = boardH - (edgeTrim * 2);

    // 2. Collect Parts from Modules
    const rawParts = collectPartsFromModules();

    if (rawParts.length === 0) {
        Toast.error("Lütfen en az bir parça ekleyin.");
        return;
    }

    // 3. Expand parts by quantity and add kerf
    let parts = [];
    let partCounter = {};

    rawParts.forEach(p => {
        const key = `${p.moduleName}-${p.partName}`;
        if (!partCounter[key]) partCounter[key] = 0;

        for (let i = 0; i < p.qty; i++) {
            partCounter[key]++;
            parts.push({
                w: p.width + kerf,
                h: p.length + kerf,
                realW: p.width,
                realH: p.length,
                id: `${key}-${partCounter[key]}`,
                moduleName: p.moduleName,
                partName: p.partName,
                partType: p.partType,
                pattern: p.pattern,
                edgeBanding: p.edgeBanding,
                index: partCounter[key],
                total: p.qty
            });
        }
    });

    // Update totals for parts
    parts.forEach(p => {
        const key = `${p.moduleName}-${p.partName}`;
        p.total = partCounter[key];
    });

    // 4. Run Packing (multi-sheet)
    let sheets = [];
    let sheetsData = []; // Store packer data for waste calculation
    let remainingParts = [...parts];
    let maxSheets = 20;

    while (remainingParts.length > 0 && maxSheets > 0) {
        maxSheets--;
        let packer = new GuillotinePacker(effectiveW, effectiveH);

        // Sort remaining by area desc
        remainingParts.sort((a, b) => (b.w * b.h) - (a.w * a.h));

        packer.fit(remainingParts);

        let sheetUsed = packer.usedRectangles;

        if (sheetUsed.length === 0) {
            Toast.error("Bazı parçalar plakadan büyük!");
            break;
        }

        sheets.push(sheetUsed);
        sheetsData.push({
            used: sheetUsed,
            waste: packer.getWasteRectangles()
        });

        // Remove fitted parts from remaining
        const fittedIds = new Set(sheetUsed.map(u => u.id));
        remainingParts = remainingParts.filter(p => !fittedIds.has(p.id));
    }

    // 5. Calculate Statistics
    const totalBoardArea = effectiveW * effectiveH * sheets.length;
    let totalUsedArea = 0;
    sheets.forEach(sheet => {
        sheet.forEach(p => {
            totalUsedArea += p.w * p.h;
        });
    });
    const efficiency = ((totalUsedArea / totalBoardArea) * 100).toFixed(1);
    const wasteArea = ((totalBoardArea - totalUsedArea) / 1000000).toFixed(2); // m²

    // Update stats display
    document.getElementById('sheetsUsed').textContent = sheets.length;
    document.getElementById('efficiency').textContent = efficiency + '%';
    document.getElementById('efficiency').className = 'value ' + (efficiency > 80 ? 'success' : efficiency > 60 ? 'warning' : 'danger');
    document.getElementById('wasteArea').textContent = wasteArea;

    // 6. Draw SVG Results
    drawResultsSVG(sheetsData, effectiveW, effectiveH, edgeTrim);

    // Show results section
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });

    Toast.success(`Optimizasyon tamamlandı! ${sheets.length} plaka, %${efficiency} verimlilik`);
}

// ========== SVG VISUALIZATION ==========
function drawResultsSVG(sheetsData, boardW, boardH, edgeTrim) {
    const container = document.getElementById('resultsGrid');
    container.innerHTML = '';

    sheetsData.forEach((sheetData, idx) => {
        const sheetParts = sheetData.used;
        const wasteRects = sheetData.waste;

        // Create wrapper
        const wrap = document.createElement('div');
        wrap.className = 'sheet-card';
        wrap.innerHTML = `
            <div class="sheet-header">
                <span class="sheet-title">Plaka ${idx + 1}</span>
                <span class="sheet-info">${sheetParts.length} parça</span>
            </div>
        `;

        // Create SVG - preserve aspect ratio correctly
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");

        // Calculate aspect ratio and max dimensions
        const aspectRatio = boardW / boardH; // 2100/2800 = 0.75 for portrait
        const maxHeight = 500; // Max height in pixels
        const calculatedWidth = maxHeight * aspectRatio;

        svg.setAttribute("width", calculatedWidth);
        svg.setAttribute("height", maxHeight);
        svg.setAttribute("viewBox", `0 0 ${boardW} ${boardH}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.border = "2px solid var(--border-color)";
        svg.style.borderRadius = "8px";
        svg.style.backgroundColor = "#f8fafc";
        svg.style.maxWidth = "100%"; // Responsive

        // Define diagonal pattern for waste
        const defs = document.createElementNS(svgNS, "defs");
        defs.innerHTML = `
            <pattern id="wastePattern${idx}" patternUnits="userSpaceOnUse" width="20" height="20">
                <rect width="20" height="20" fill="#fef2f2"/>
                <path d="M-5,5 l10,-10 M0,20 l20,-20 M15,25 l10,-10" 
                      stroke="#ef4444" stroke-width="2" opacity="0.5"/>
            </pattern>
        `;
        svg.appendChild(defs);

        // Draw waste areas first (background)
        wasteRects.forEach(w => {
            const rect = document.createElementNS(svgNS, "rect");
            rect.setAttribute("x", w.x);
            rect.setAttribute("y", w.y);
            rect.setAttribute("width", w.w);
            rect.setAttribute("height", w.h);
            rect.setAttribute("fill", `url(#wastePattern${idx})`);
            rect.setAttribute("stroke", "#ef4444");
            rect.setAttribute("stroke-width", "1");
            rect.setAttribute("stroke-dasharray", "5,5");
            svg.appendChild(rect);
        });

        // Draw parts
        sheetParts.forEach((p, partIdx) => {
            const g = document.createElementNS(svgNS, "g");
            g.setAttribute("class", "part-group");
            g.style.cursor = "pointer";

            // Part rectangle
            const rect = document.createElementNS(svgNS, "rect");
            rect.setAttribute("x", p.x);
            rect.setAttribute("y", p.y);
            rect.setAttribute("width", p.w - 3); // Visual gap
            rect.setAttribute("height", p.h - 3);
            rect.setAttribute("fill", PART_COLORS[p.partType] || PART_COLORS.default);
            rect.setAttribute("stroke", "#ffffff");
            rect.setAttribute("stroke-width", "2");
            rect.setAttribute("rx", "4");
            g.appendChild(rect);

            // Calculate if we have enough space for labels
            const minWidthForText = 80;
            const minHeightForText = 50;
            const hasSpaceForLabels = p.w > minWidthForText && p.h > minHeightForText;

            if (hasSpaceForLabels) {
                // Module name (small, top)
                const moduleText = document.createElementNS(svgNS, "text");
                moduleText.setAttribute("x", p.x + 8);
                moduleText.setAttribute("y", p.y + 18);
                moduleText.setAttribute("fill", "rgba(255,255,255,0.8)");
                moduleText.setAttribute("font-size", "11");
                moduleText.setAttribute("font-weight", "500");
                moduleText.textContent = truncate(p.moduleName, 15);
                g.appendChild(moduleText);

                // Part name (main label)
                const partText = document.createElementNS(svgNS, "text");
                partText.setAttribute("x", p.x + 8);
                partText.setAttribute("y", p.y + 35);
                partText.setAttribute("fill", "#ffffff");
                partText.setAttribute("font-size", "14");
                partText.setAttribute("font-weight", "700");
                partText.textContent = truncate(p.partName, 12);
                g.appendChild(partText);

                // Dimensions
                const dimText = document.createElementNS(svgNS, "text");
                dimText.setAttribute("x", p.x + 8);
                dimText.setAttribute("y", p.y + 52);
                dimText.setAttribute("fill", "rgba(255,255,255,0.9)");
                dimText.setAttribute("font-size", "12");
                dimText.textContent = `${Math.round(p.realH)} × ${Math.round(p.realW)}`;
                g.appendChild(dimText);

                // Edge banding badge
                if (p.edgeBanding) {
                    const badgeG = document.createElementNS(svgNS, "g");

                    const badgeRect = document.createElementNS(svgNS, "rect");
                    badgeRect.setAttribute("x", p.x + 8);
                    badgeRect.setAttribute("y", p.y + p.h - 28);
                    badgeRect.setAttribute("width", 35);
                    badgeRect.setAttribute("height", 18);
                    badgeRect.setAttribute("fill", "rgba(0,0,0,0.3)");
                    badgeRect.setAttribute("rx", "4");
                    badgeG.appendChild(badgeRect);

                    const badgeText = document.createElementNS(svgNS, "text");
                    badgeText.setAttribute("x", p.x + 14);
                    badgeText.setAttribute("y", p.y + p.h - 15);
                    badgeText.setAttribute("fill", "#ffffff");
                    badgeText.setAttribute("font-size", "11");
                    badgeText.setAttribute("font-weight", "600");
                    badgeText.textContent = p.edgeBanding;
                    badgeG.appendChild(badgeText);

                    g.appendChild(badgeG);
                }
            } else {
                // Small part - just show number
                const numText = document.createElementNS(svgNS, "text");
                numText.setAttribute("x", p.x + p.w / 2);
                numText.setAttribute("y", p.y + p.h / 2 + 5);
                numText.setAttribute("fill", "#ffffff");
                numText.setAttribute("font-size", "12");
                numText.setAttribute("font-weight", "700");
                numText.setAttribute("text-anchor", "middle");
                numText.textContent = (partIdx + 1).toString();
                g.appendChild(numText);
            }

            // Hover tooltip
            const title = document.createElementNS(svgNS, "title");
            title.textContent = `${p.moduleName} > ${p.partName}\n${Math.round(p.realH)} × ${Math.round(p.realW)} mm\nKenar: ${p.edgeBanding || 'Yok'}${p.rotated ? '\n(Döndürüldü)' : ''}`;
            g.appendChild(title);

            svg.appendChild(g);
        });

        wrap.appendChild(svg);

        // Add legend for this sheet
        const legend = document.createElement('div');
        legend.className = 'sheet-legend';
        legend.innerHTML = createLegendHTML(sheetParts);
        wrap.appendChild(legend);

        container.appendChild(wrap);
    });

    // Add global legend
    addGlobalLegend(container);
}

// ========== HELPER FUNCTIONS ==========
function truncate(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen - 1) + '…' : str;
}

function createLegendHTML(parts) {
    // Group parts by module
    const modules = {};
    parts.forEach(p => {
        if (!modules[p.moduleName]) modules[p.moduleName] = [];
        modules[p.moduleName].push(p.partName);
    });

    let html = '<div class="legend-items">';
    Object.entries(modules).forEach(([mod, partNames]) => {
        const uniqueParts = [...new Set(partNames)];
        html += `<span class="legend-item"><strong>${mod}:</strong> ${uniqueParts.slice(0, 3).join(', ')}${uniqueParts.length > 3 ? '...' : ''}</span>`;
    });
    html += '</div>';
    return html;
}

function addGlobalLegend(container) {
    const legendDiv = document.createElement('div');
    legendDiv.className = 'global-legend';
    legendDiv.innerHTML = `
        <div class="legend-title">Renk Açıklaması</div>
        <div class="legend-grid">
            <div class="legend-entry">
                <span class="legend-color" style="background: ${PART_COLORS.cabinet}"></span>
                <span>Gövde</span>
            </div>
            <div class="legend-entry">
                <span class="legend-color" style="background: ${PART_COLORS.door}"></span>
                <span>Kapak</span>
            </div>
            <div class="legend-entry">
                <span class="legend-color" style="background: ${PART_COLORS.drawer}"></span>
                <span>Çekmece</span>
            </div>
            <div class="legend-entry">
                <span class="legend-color" style="background: ${PART_COLORS.back}"></span>
                <span>Arkalık</span>
            </div>
            <div class="legend-entry">
                <span class="legend-color waste-pattern"></span>
                <span>Fire</span>
            </div>
        </div>
    `;
    container.appendChild(legendDiv);
}
