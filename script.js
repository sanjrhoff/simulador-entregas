// Definições de classes e estruturas de dados
class Queue {
    constructor() {
        this.items = [];
    }
    
    // Adicionar pacote à fila (enqueue)
    enqueue(item) {
        this.items.push(item);
    }
    
    // Remover pacote da fila (dequeue)
    dequeue() {
        if (this.isEmpty()) {
            return null;
        }
        return this.items.shift();
    }
    
    // Remover pacote específico por ID
    removeById(id) {
        if (this.isEmpty()) {
            return null;
        }
        
        const index = this.items.findIndex(item => item.id === id);
        if (index === -1) {
            return null;
        }
        
        return this.items.splice(index, 1)[0];
    }
    
    // Verificar se a fila está vazia
    isEmpty() {
        return this.items.length === 0;
    }
    
    // Visualizar o próximo pacote a ser entregue sem removê-lo
    peek() {
        if (this.isEmpty()) {
            return null;
        }
        return this.items[0];
    }
    
    // Obter pacote por ID
    getById(id) {
        return this.items.find(item => item.id === id);
    }
    
    // Obter o tamanho da fila
    size() {
        return this.items.length;
    }
    
    // Limpar a fila
    clear() {
        this.items = [];
    }
    
    // Obter todos os itens da fila
    getAll() {
        return [...this.items];
    }
}

// Classe para representar um pacote
class Package {
    constructor(name, recipient) {
        this.id = this.generateId();
        this.name = name;
        this.recipient = recipient;
        this.createdAt = new Date();
        // Gerar tempo estimado aleatório entre 3 e 15 minutos
        this.estimatedTime = this.generateRandomDeliveryTime();
    }
    
    generateId() {
        return Math.random().toString(36).substring(2, 10);
    }
    
    generateRandomDeliveryTime() {
        // Gerar tempo aleatório entre 3 e 15 minutos
        return Math.floor(Math.random() * 13) + 3;
    }
}

// Sistema de persistência de dados usando localStorage
class StorageManager {
    static saveQueue(queue) {
        localStorage.setItem('deliveryQueue', JSON.stringify(queue.items));
    }
    
    static saveHistory(history) {
        localStorage.setItem('deliveryHistory', JSON.stringify(history));
    }
    
    static loadQueue() {
        const storedQueue = localStorage.getItem('deliveryQueue');
        return storedQueue ? JSON.parse(storedQueue) : [];
    }
    
    static loadHistory() {
        const storedHistory = localStorage.getItem('deliveryHistory');
        return storedHistory ? JSON.parse(storedHistory) : [];
    }
    
    static clearAll() {
        localStorage.removeItem('deliveryQueue');
        localStorage.removeItem('deliveryHistory');
    }
}

// Inicialização de variáveis e objetos
const deliveryQueue = new Queue();
let deliveryHistory = [];
let currentRecipient = null;
let selectedPackageId = null;
let isDelivering = false;
let timerInterval = null;

// Referências aos elementos do DOM
const packageNameInput = document.getElementById('packageName');
const generatePackageBtn = document.getElementById('generatePackage');
const addToQueueBtn = document.getElementById('addToQueue');
const deliverPackageBtn = document.getElementById('deliverPackage');
const clearQueueBtn = document.getElementById('clearQueue');
const clearDataBtn = document.getElementById('clearData');
const clearHistoryBtn = document.getElementById('clearHistory');
const recipientInfoDiv = document.getElementById('recipientDetails');
const queueContainer = document.getElementById('queueContainer');
const historyContainer = document.getElementById('historyContainer');
const queueCountSpan = document.getElementById('queueCount');
const deliveryTruck = document.getElementById('deliveryTruck');
const destinationMarker = document.getElementById('destinationMarker');
const deliveryStatus = document.getElementById('deliveryStatus');
const timerContainer = document.getElementById('timerContainer');
const timerBar = document.getElementById('timerBar');

// Função para consumir a API Random User e obter dados de um destinatário
async function fetchRandomUser() {
    try {
        const response = await fetch('https://randomuser.me/api/');
        const data = await response.json();
        return data.results[0];
    } catch (error) {
        console.error('Erro ao buscar usuário aleatório:', error);
        return null;
    }
}

// Exibir informações do destinatário gerado
function displayRecipientInfo(recipient) {
    if (!recipient) {
        recipientInfoDiv.innerHTML = '<p>Erro ao gerar destinatário. Tente novamente.</p>';
        return;
    }
    
    const fullName = `${recipient.name.first} ${recipient.name.last}`;
    const location = `${recipient.location.street.name}, ${recipient.location.street.number}`;
    const cityCountry = `${recipient.location.city}, ${recipient.location.country}`;
    
    recipientInfoDiv.innerHTML = `
        <div class="recipient-container">
            <img src="${recipient.picture.large}" alt="${fullName}" class="recipient-avatar">
            <div class="recipient-details">
                <p><strong>Nome:</strong> ${fullName}</p>
                <p><strong>Endereço:</strong> ${location}</p>
                <p><strong>Cidade/País:</strong> ${cityCountry}</p>
                <p><strong>Email:</strong> ${recipient.email}</p>
                <p><strong>Telefone:</strong> ${recipient.phone}</p>
            </div>
        </div>
    `;
}

// Atualizar a exibição da fila de entregas
function updateQueueDisplay() {
    const packages = deliveryQueue.getAll();
    queueCountSpan.textContent = packages.length;
    
    if (packages.length === 0) {
        queueContainer.innerHTML = '<p class="empty-queue">Não há pacotes na fila</p>';
        deliverPackageBtn.disabled = true;
        clearQueueBtn.disabled = true;
        return;
    }
    
    deliverPackageBtn.disabled = isDelivering;
    clearQueueBtn.disabled = isDelivering;
    queueContainer.innerHTML = '';
    
    packages.forEach((pkg, index) => {
        const fullName = `${pkg.recipient.name.first} ${pkg.recipient.name.last}`;
        const location = `${pkg.recipient.location.city}, ${pkg.recipient.location.country}`;
        
        const queueItem = document.createElement('div');
        queueItem.className = 'queue-item';
        queueItem.dataset.id = pkg.id;
        
        if (pkg.id === selectedPackageId) {
            queueItem.classList.add('selected');
        }
        
        if (index === 0) {
            queueItem.classList.add('next-delivery');
        }
        
        // Calcular tempo estimado em formato legível
        const estimatedTimeText = pkg.estimatedTime === 1 
            ? '1 minuto' 
            : `${pkg.estimatedTime} minutos`;
        
        queueItem.innerHTML = `
            <div class="queue-item-info">
                <h4>${pkg.name}</h4>
                <p>Para: ${fullName}</p>
                <p>Destino: ${location}</p>
                <div class="delivery-time-estimate">
                    <i class="fas fa-clock"></i> Tempo estimado: ${estimatedTimeText}
                </div>
                <span class="package-id">ID: ${pkg.id}</span>
                <div class="queue-item-actions">
                    <button class="action-button deliver-btn" title="Entregar este pacote" ${isDelivering ? 'disabled' : ''}>
                        <i class="fas fa-shipping-fast"></i> Entregar
                    </button>
                    <button class="action-button remove-btn" title="Remover da fila" ${isDelivering ? 'disabled' : ''}>
                        <i class="fas fa-trash-alt"></i> Remover
                    </button>
                </div>
            </div>
            <div class="queue-position">
                <span class="position-number">${index + 1}</span>
            </div>
        `;
        
        queueContainer.appendChild(queueItem);
        
        // Adicionar event listeners para os botões
        const deliverBtn = queueItem.querySelector('.deliver-btn');
        const removeBtn = queueItem.querySelector('.remove-btn');
        
        deliverBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar propagação do clique para o elemento pai
            if (!isDelivering) {
                deliverSpecificPackage(pkg.id);
            }
        });
        
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar propagação do clique para o elemento pai
            if (!isDelivering) {
                removePackageFromQueue(pkg.id);
            }
        });
        
        // Adicionar event listener para selecionar o pacote
        queueItem.addEventListener('click', () => {
            if (!isDelivering) {
                selectPackage(pkg.id);
            }
        });
    });
    
    // Salvar dados da fila
    StorageManager.saveQueue(deliveryQueue);
}

// Selecionar pacote na fila
function selectPackage(id) {
    if (isDelivering) return;
    
    // Toggle seleção
    if (selectedPackageId === id) {
        selectedPackageId = null;
    } else {
        selectedPackageId = id;
    }
    
    // Atualizar interface
    updateQueueDisplay();
}

// Remover pacote específico da fila
function removePackageFromQueue(id) {
    if (isDelivering) {
        alert('Não é possível remover pacotes durante uma entrega.');
        return;
    }
    
    const removedPackage = deliveryQueue.removeById(id);
    
    if (removedPackage) {
        // Se o pacote removido era o selecionado, limpar seleção
        if (selectedPackageId === id) {
            selectedPackageId = null;
        }
        
        // ADICIONADO: Salvar o estado atualizado da fila no localStorage imediatamente
        StorageManager.saveQueue(deliveryQueue);
        
        // Atualizar interface
        updateQueueDisplay();
    }
}

// Entregar pacote específico
function deliverSpecificPackage(id) {
    if (isDelivering) {
        alert('Uma entrega já está em andamento. Aguarde a conclusão.');
        return;
    }
    
    // Verificar se o pacote existe na fila
    const packageToDeliver = deliveryQueue.getById(id);
    
    if (!packageToDeliver) {
        alert('Pacote não encontrado na fila.');
        return;
    }
    
    // Remover pacote da fila
    deliveryQueue.removeById(id);
    
    // ADICIONADO: Salvar o estado atualizado da fila no localStorage imediatamente
    StorageManager.saveQueue(deliveryQueue);
    
    // Iniciar entrega
    startDelivery(packageToDeliver);
}

// Atualizar a exibição do histórico de entregas
function updateHistoryDisplay() {
    if (deliveryHistory.length === 0) {
        historyContainer.innerHTML = '<p class="empty-history">Nenhuma entrega realizada</p>';
        clearHistoryBtn.disabled = true;
        return;
    }
    
    clearHistoryBtn.disabled = isDelivering;
    historyContainer.innerHTML = '';
    
    // Ordenar do mais recente para o mais antigo
    const sortedHistory = [...deliveryHistory].reverse();
    
    sortedHistory.forEach(delivery => {
        const { pkg, deliveredAt, deliveryTime } = delivery;
        const fullName = `${pkg.recipient.name.first} ${pkg.recipient.name.last}`;
        const location = `${pkg.recipient.location.city}, ${pkg.recipient.location.country}`;
        
        const formattedDate = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(deliveredAt));
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        historyItem.innerHTML = `
            <div class="history-item-info">
                <h4>${pkg.name}</h4>
                <p>Entregue para: ${fullName}</p>
                <p>Destino: ${location}</p>
                <div class="delivery-time-estimate">
                    <i class="fas fa-clock"></i> Tempo real de entrega: ${deliveryTime} segundos
                </div>
            </div>
            <div class="history-item-time">
                <p>${formattedDate}</p>
            </div>
        `;
        
        historyContainer.appendChild(historyItem);
    });
    
    // Salvar dados do histórico
    StorageManager.saveHistory(deliveryHistory);
}

// Substitua a função startDelivery no script.js pelo código abaixo:

function startDelivery(packageToDeliver) {
    // Marcar como entregando
    isDelivering = true;
    
    // Desabilitar botões durante a entrega
    deliverPackageBtn.disabled = true;
    clearQueueBtn.disabled = true;
    clearDataBtn.disabled = true;
    clearHistoryBtn.disabled = true;
    
    // Atualizar interface da fila
    updateQueueDisplay();
    
    // Resetar posição do caminhão
    deliveryTruck.style.left = '0';
    
    // Remover a classe de animação CSS que poderia estar aplicada
    deliveryTruck.classList.remove('deliver-animation');
    
    // Mostrar o marcador de destino
    destinationMarker.style.opacity = '1';
    
    // Atualizar status
    const fullName = `${packageToDeliver.recipient.name.first} ${packageToDeliver.recipient.name.last}`;
    deliveryStatus.innerHTML = `
        <p>Entregando pacote <strong>${packageToDeliver.name}</strong> para <strong>${fullName}</strong>...</p>
    `;
    
    // Configurar tempo de entrega (converter minutos para segundos para a simulação)
    // Para fins de demonstração, cada "minuto" será representado por 1 segundo
    const deliveryTimeInSeconds = packageToDeliver.estimatedTime;
    let timeElapsed = 0;
    
    // Mostrar e resetar barra de progresso
    timerContainer.style.display = 'block';
    timerBar.style.width = '0%';
    
    // Iniciar timer
    const startTime = new Date();
    
    timerInterval = setInterval(() => {
        timeElapsed += 0.1;
        const progress = (timeElapsed / deliveryTimeInSeconds) * 100;
        
        // Atualizar barra de progresso
        timerBar.style.width = `${Math.min(progress, 100)}%`;
        
        // Atualizar posição do caminhão
        // Calculamos a posição de forma que termine exatamente quando a barra estiver completa
        const truckPosition = (progress / 100) * (document.querySelector('.road').offsetWidth - 60);
        deliveryTruck.style.left = `${truckPosition}px`;
        
        // Verificar se a entrega foi concluída
        if (timeElapsed >= deliveryTimeInSeconds) {
            clearInterval(timerInterval);
            completeDelivery(packageToDeliver, timeElapsed);
        }
    }, 100);
}

// Também vamos atualizar a função completeDelivery para manter a consistência:

function completeDelivery(deliveredPackage, deliveryTime) {
    // Atualizar status
    const fullName = `${deliveredPackage.recipient.name.first} ${deliveredPackage.recipient.name.last}`;
    deliveryStatus.innerHTML = `
        <p>Pacote <strong>${deliveredPackage.name}</strong> entregue com sucesso para <strong>${fullName}</strong>!</p>
    `;
    
    // Adicionar ao histórico
    deliveryHistory.push({
        pkg: deliveredPackage,
        deliveredAt: new Date(),
        deliveryTime: deliveryTime.toFixed(1)
    });
    
    // Esconder o marcador de destino após um tempo
    setTimeout(() => {
        destinationMarker.style.opacity = '0';
        deliveryTruck.style.left = '0'; // Resetar posição do caminhão
        deliveryStatus.innerHTML = '<p>Aguardando próxima entrega...</p>';
        timerContainer.style.display = 'none';
        
        // Marcar como não entregando mais
        isDelivering = false;
        
        // Habilitar botões
        deliverPackageBtn.disabled = deliveryQueue.isEmpty();
        clearQueueBtn.disabled = deliveryQueue.isEmpty();
        clearDataBtn.disabled = false;
        clearHistoryBtn.disabled = deliveryHistory.length === 0;
        
        // Limpar seleção atual
        selectedPackageId = null;
        
        // Atualizar interfaces
        updateQueueDisplay();
        updateHistoryDisplay();
    }, 1500);
}

    
   

// Concluir o processo de entrega
function completeDelivery(deliveredPackage, deliveryTime) {
    // Atualizar status
    const fullName = `${deliveredPackage.recipient.name.first} ${deliveredPackage.recipient.name.last}`;
    deliveryStatus.innerHTML = `
        <p>Pacote <strong>${deliveredPackage.name}</strong> entregue com sucesso para <strong>${fullName}</strong>!</p>
    `;
    
    // Adicionar ao histórico
    deliveryHistory.push({
        pkg: deliveredPackage,
        deliveredAt: new Date(),
        deliveryTime: deliveryTime.toFixed(1)
    });
    
    // Esconder o marcador de destino após um tempo
    setTimeout(() => {
        destinationMarker.style.opacity = '0';
        deliveryTruck.classList.remove('deliver-animation');
        deliveryStatus.innerHTML = '<p>Aguardando próxima entrega...</p>';
        timerContainer.style.display = 'none';
        
        // Marcar como não entregando mais
        isDelivering = false;
        
        // Habilitar botões
        deliverPackageBtn.disabled = deliveryQueue.isEmpty();
        clearQueueBtn.disabled = deliveryQueue.isEmpty();
        clearDataBtn.disabled = false;
        clearHistoryBtn.disabled = deliveryHistory.length === 0;
        
        // Limpar seleção atual
        selectedPackageId = null;
        
        // Atualizar interfaces
        updateQueueDisplay();
        updateHistoryDisplay();
    }, 1500);
}

// Carregar dados do localStorage
function loadSavedData() {
    // Carregar dados da fila
    const savedQueue = StorageManager.loadQueue();
    if (savedQueue && savedQueue.length > 0) {
        savedQueue.forEach(item => {
            deliveryQueue.enqueue(item);
        });
    }
    
    // Carregar dados do histórico
    const savedHistory = StorageManager.loadHistory();
    if (savedHistory && savedHistory.length > 0) {
        deliveryHistory = savedHistory;
    }
    
    // Atualizar interfaces
    updateQueueDisplay();
    updateHistoryDisplay();
}

// Limpar todos os dados
function clearAllData() {
    if (isDelivering) {
        alert('Não é possível limpar os dados durante uma entrega.');
        return;
    }
    
    if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
        deliveryQueue.clear();
        deliveryHistory = [];
        selectedPackageId = null;
        
        // Limpar localStorage
        StorageManager.clearAll();
        
        // Atualizar interfaces
        updateQueueDisplay();
        updateHistoryDisplay();
        
        alert('Todos os dados foram limpos com sucesso.');
    }
}

// Limpar apenas a fila
function clearQueueOnly() {
    if (isDelivering) {
        alert('Não é possível limpar a fila durante uma entrega.');
        return;
    }
    
    if (confirm('Tem certeza que deseja limpar a fila de entregas? Esta ação não pode ser desfeita.')) {
        deliveryQueue.clear();
        selectedPackageId = null;
        
        // Atualizar localStorage
        StorageManager.saveQueue(deliveryQueue);
        
        // Atualizar interface
        updateQueueDisplay();
        
        alert('A fila de entregas foi limpa com sucesso.');
    }
}

// Limpar apenas o histórico
function clearHistoryOnly() {
    if (isDelivering) {
        alert('Não é possível limpar o histórico durante uma entrega.');
        return;
    }
    
    if (confirm('Tem certeza que deseja limpar o histórico de entregas? Esta ação não pode ser desfeita.')) {
        deliveryHistory = [];
        
        // Atualizar localStorage
        StorageManager.saveHistory(deliveryHistory);
        
        // Atualizar interface
        updateHistoryDisplay();
        
        alert('O histórico de entregas foi limpo com sucesso.');
    }
}

// Handlers de eventos
generatePackageBtn.addEventListener('click', async () => {
    if (isDelivering) return;
    
    const recipient = await fetchRandomUser();
    currentRecipient = recipient;
    displayRecipientInfo(recipient);
    
    // Habilitar botão de adicionar à fila se tiver nome do pacote
    addToQueueBtn.disabled = !(packageNameInput.value.trim() && currentRecipient);
});

packageNameInput.addEventListener('input', () => {
    // Habilitar/desabilitar botão de adicionar à fila
    addToQueueBtn.disabled = !(packageNameInput.value.trim() && currentRecipient);
});

addToQueueBtn.addEventListener('click', () => {
    if (isDelivering) return;
    
    const packageName = packageNameInput.value.trim();
    
    if (!packageName) {
        alert('Por favor, informe o nome do pacote.');
        return;
    }
    
    if (!currentRecipient) {
        alert('Por favor, gere um destinatário para o pacote.');
        return;
    }
    
    // Criar novo pacote e adicionar à fila
    const newPackage = new Package(packageName, currentRecipient);
    deliveryQueue.enqueue(newPackage);
    
    // Atualizar interface
    updateQueueDisplay();
    
    // Resetar formulário
    packageNameInput.value = '';
    currentRecipient = null;
    recipientInfoDiv.innerHTML = '<p>Gere um pacote para ver as informações do destinatário.</p>';
    addToQueueBtn.disabled = true;
    
    // Destacar item adicionado
    const queueItems = document.querySelectorAll('.queue-item');
    if (queueItems.length > 0) {
        const lastItem = queueItems[queueItems.length - 1];
        lastItem.classList.add('highlight');
        setTimeout(() => {
            lastItem.classList.remove('highlight');
        }, 1000);
    }
});

// Entregar próximo pacote (o primeiro da fila)
deliverPackageBtn.addEventListener('click', () => {
    if (isDelivering || deliveryQueue.isEmpty()) {
        return;
    }
    
    // Remover pacote da fila (primeiro item - FIFO)
    const packageToDeliver = deliveryQueue.dequeue();
    
    // ADICIONADO: Salvar o estado atualizado da fila no localStorage imediatamente
    StorageManager.saveQueue(deliveryQueue);
    
    // Iniciar entrega
    startDelivery(packageToDeliver);
});

// Limpar fila
clearQueueBtn.addEventListener('click', clearQueueOnly);

// Limpar histórico
clearHistoryBtn.addEventListener('click', clearHistoryOnly);

// Limpar todos os dados
clearDataBtn.addEventListener('click', clearAllData);

// Inicialização da página
document.addEventListener('DOMContentLoaded', () => {
    // Carregar dados salvos no localStorage
    loadSavedData();
    
    // Configurar estado inicial dos botões
    addToQueueBtn.disabled = true;
});