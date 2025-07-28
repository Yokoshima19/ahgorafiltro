document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const processButton = document.getElementById('processButton');
    const downloadButton = document.getElementById('downloadButton');
    const outputContent = document.getElementById('outputContent');
    const messageArea = document.getElementById('messageArea');
    const loadingSpinner = document.getElementById('loadingSpinner');

    let uploadedFileContent = null;
    let processedFileContent = null;

    // Habilita o botão de processar quando um arquivo é selecionado
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            messageArea.textContent = ''; // Limpa mensagens de erro anteriores
            processButton.disabled = false;
            downloadButton.disabled = true;
            outputContent.value = 'Arquivo pronto para processamento.';
            
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedFileContent = e.target.result;
                console.log("DEBUG: Conteúdo do arquivo lido. Tamanho:", uploadedFileContent.length);
            };
            reader.onerror = () => {
                messageArea.textContent = 'Erro ao ler o arquivo.';
                uploadedFileContent = null;
                processButton.disabled = true;
                console.error("DEBUG: Erro ao ler o arquivo.");
            };
            reader.readAsText(file, 'UTF-8');
        } else {
            processButton.disabled = true;
            downloadButton.disabled = true;
            outputContent.value = '';
            uploadedFileContent = null;
            console.log("DEBUG: Nenhum arquivo selecionado.");
        }
    });

    // Lógica de processamento do arquivo
    processButton.addEventListener('click', () => {
        if (!uploadedFileContent) {
            messageArea.textContent = 'Por favor, selecione um arquivo primeiro.';
            console.warn("DEBUG: Tentativa de processar sem arquivo carregado.");
            return;
        }

        messageArea.textContent = '';
        outputContent.value = 'Processando...';
        processButton.disabled = true;
        downloadButton.disabled = true;
        loadingSpinner.classList.remove('hidden'); // Mostra o spinner

        // Simula um atraso para mostrar o spinner (remova em produção se não for necessário)
        setTimeout(() => {
            try {
                // Garante que as linhas são separadas corretamente e trimadas
                const linhas = uploadedFileContent.split(/\r?\n/).map(line => line.trim()); 
                console.log("DEBUG: Total de linhas lidas:", linhas.length);
                console.log("DEBUG: Primeiras 5 linhas:", linhas.slice(0, 5));

                // Etapa 1: Identificar o primeiro ID para cada CPF nas linhas tipo 03
                const cpfParaPrimeiroId = {};
                const idSubstituicoes = {};

                for (const linha of linhas) {
                    if (linha.startsWith("03|")) {
                        const partes = linha.split("|");
                        // Garante que a linha tem partes suficientes para acessar o ID e CPF
                        if (partes.length > 2) {
                            const id = partes[1];
                            const cpf = partes[2];
                            if (!cpfParaPrimeiroId.hasOwnProperty(cpf)) {
                                cpfParaPrimeiroId[cpf] = id;
                            }
                            idSubstituicoes[id] = cpfParaPrimeiroId[cpf];
                        } else {
                            console.warn(`DEBUG: Linha 03| mal formatada (menos de 3 partes): ${linha}`);
                        }
                    }
                }
                console.log("DEBUG: cpfParaPrimeiroId:", cpfParaPrimeiroId);
                console.log("DEBUG: idSubstituicoes:", idSubstituicoes);

                // Etapa 2: Substituir os IDs nas linhas 03 e 05
                const linhasSubstituidas = linhas.map(linha => {
                    if (linha.startsWith("03|") || linha.startsWith("05|")) {
                        const partes = linha.split("|");
                        // Garante que a linha tem partes suficientes para acessar o ID
                        if (partes.length > 1) {
                            const tipo = linha.substring(0, 2);
                            const id = partes[1];
                            if (idSubstituicoes.hasOwnProperty(id)) {
                                const novoId = idSubstituicoes[id];
                                // Usa replace para garantir que apenas o primeiro ID após o tipo seja substituído
                                // Garante que o ID é um número para evitar problemas com regex
                                const regex = new RegExp(`^${tipo}\\|${id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\|`);
                                const novaLinha = linha.replace(regex, `${tipo}|${novoId}|`);
                                if (linha !== novaLinha) {
                                    // console.log(`DEBUG: Substituindo em linha ${tipo}: '${id}' por '${novoId}'. Original: '${linha}', Nova: '${novaLinha}'`);
                                }
                                return novaLinha;
                            }
                        } else {
                            console.warn(`DEBUG: Linha ${linha.substring(0,2)}| mal formatada (menos de 2 partes): ${linha}`);
                        }
                    }
                    return linha;
                });
                console.log("DEBUG: Primeiras 5 linhas substituídas:", linhasSubstituidas.slice(0, 5));


                // Etapa 3: Remover as linhas duplicadas do tipo 03
                const cpfIdsMantidos = {};
                const linhasFinais = [];

                for (const linha of linhasSubstituidas) {
                    if (linha.startsWith("03|")) {
                        const partes = linha.split("|");
                        // Garante que a linha tem partes suficientes para acessar o ID e CPF
                        if (partes.length > 2) {
                            const id = partes[1];
                            const cpf = partes[2];
                            // Verifica se o ID atual é o primeiro ID para este CPF e se ainda não foi mantido
                            if (cpfParaPrimeiroId[cpf] === id && !cpfIdsMantidos.hasOwnProperty(`${cpf}|${id}`)) {
                                cpfIdsMantidos[`${cpf}|${id}`] = true;
                                linhasFinais.push(linha);
                            } else {
                                // console.log(`DEBUG: Removendo linha 03| duplicada ou não-primeiro ID: ${linha}`);
                            }
                        } else {
                            linhasFinais.push(linha); // Mantém linhas 03| mal formatadas na etapa final se não puderem ser processadas
                            console.warn(`DEBUG: Linha 03| mal formatada (menos de 3 partes) na etapa de remoção de duplicatas: ${linha}`);
                        }
                    } else {
                        linhasFinais.push(linha);
                    }
                }
                console.log("DEBUG: Total de linhas finais:", linhasFinais.length);
                console.log("DEBUG: Primeiras 5 linhas finais:", linhasFinais.slice(0, 5));


                processedFileContent = linhasFinais.join('\n');
                outputContent.value = processedFileContent;
                downloadButton.disabled = false;
                messageArea.textContent = 'Arquivo processado com sucesso!';

            } catch (error) {
                messageArea.textContent = `Erro ao processar o arquivo: ${error.message}`;
                outputContent.value = 'Erro no processamento.';
                console.error('DEBUG: Erro de processamento:', error);
            } finally {
                processButton.disabled = false;
                loadingSpinner.classList.add('hidden'); // Esconde o spinner
            }
        }, 50); // Pequeno atraso para UX
    });

    // Lógica de download do arquivo
    downloadButton.addEventListener('click', () => {
        if (processedFileContent) {
            const blob = new Blob([processedFileContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'aej_final.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log("DEBUG: Arquivo baixado.");
        } else {
            messageArea.textContent = 'Nenhum conteúdo processado para baixar.';
            console.warn("DEBUG: Tentativa de baixar sem conteúdo processado.");
        }
    });
});
