document.addEventListener("DOMContentLoaded", function () {
    const fileInput = document.getElementById("fileInput");
    const processButton = document.getElementById("processButton");
    const outputContent = document.getElementById("outputContentInitial");
    const filteredTabButton = document.getElementById("filteredTab");
    const downloadButton = document.getElementById("downloadButton");
    const tabButtons = document.querySelectorAll("button[role='tab']");
    const tabPanels = document.querySelectorAll(".tab-content");

    function switchTab(targetId) {
        tabButtons.forEach(btn => {
            btn.setAttribute("aria-selected", btn.id === targetId);
            btn.setAttribute("tabindex", btn.id === targetId ? "0" : "-1");
        });

        tabPanels.forEach(panel => {
            if (panel.id === document.getElementById(targetId).getAttribute("aria-controls")) {
                panel.removeAttribute("hidden");
            } else {
                panel.setAttribute("hidden", "");
            }
        });
    }

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => switchTab(btn.id));
    });

    processButton.addEventListener("click", () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const content = e.target.result;
            outputContent.value = content;

            const lines = content.split("\n").filter(line => line.startsWith("03|"));
            if (lines.length === 0) return;

            const headerRow = document.getElementById("tableHeaderRow");
            const body = document.getElementById("tableBody");
            headerRow.innerHTML = "";
            body.innerHTML = "";

            const headers = ["Tipo", "ID Vínculo", "CPF", "Nome Empregado"];
            headers.forEach(h => {
                const th = document.createElement("th");
                th.textContent = h;
                headerRow.appendChild(th);
            });

            lines.forEach(line => {
                const parts = line.split("|");
                const tr = document.createElement("tr");
                for (let i = 0; i < headers.length; i++) {
                    const td = document.createElement("td");
                    td.textContent = parts[i] || "";
                    tr.appendChild(td);
                }
                body.appendChild(tr);
            });

            $('#filteredTable').DataTable({
                destroy: true,
                dom: 'Bfrtip',
                buttons: ['excel'],
                scrollX: true
            });

            // Ir para aba filtragem
            switchTab('tabAdvancedFilter');

            // Habilita botão de download
            if (downloadButton) downloadButton.disabled = false;
        };

        reader.readAsText(file);
    });

    if (downloadButton) {
        downloadButton.addEventListener("click", () => {
            const table = $('#filteredTable').DataTable();
            table.button('.buttons-excel').trigger();
        });
    }
});

document.getElementById("downloadTxtButton").addEventListener("click", () => {
    const content = document.getElementById("outputContentInitial").value;
    if (!content) return;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "aej_processado.txt";
    link.click();
});