/**
 * NTU 教學意見調查自動填寫工具 - 彈出視窗腳本
 * 管理用戶設定界面與互動
 */

// 全域常數
const UI = {
  STATUS_TIMEOUT: {
    SUCCESS: 1500,
    ERROR: 5000
  },
  POPUP_WIDTH: 550
};

// 全域變數
let taList = []; // 儲存目前頁面的助教列表

// 當彈出視窗載入完成時初始化
document.addEventListener('DOMContentLoaded', function() {
  // 強制設定最小寬度，確保彈出視窗足夠寬
  document.body.style.minWidth = '550px';
  document.body.style.width = '550px';
  
  initializePopup();
});

/**
 * 初始化彈出視窗
 */
function initializePopup() {
  // 設定視窗寬度
  document.documentElement.style.minWidth = UI.POPUP_WIDTH + 'px';
  document.body.style.minWidth = UI.POPUP_WIDTH + 'px';
  document.body.style.width = UI.POPUP_WIDTH + 'px';
  
  // 載入儲存的設定
  loadSettings();
  
  // 設置UI互動
  setupTabNavigation();
  setupOptionTypeToggles();
  setupExtracurricularToggle();
  setupTaSelectionMode();
  
  // 設置刷新助教列表按鈕
  document.getElementById('refresh-ta-list').addEventListener('click', fetchTaList);

  // 設置按鈕點擊事件
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('fillBtn').addEventListener('click', fillForm);
  
  // 第一次載入時嘗試獲取助教列表
  fetchTaList();
  
  console.log("彈出視窗已初始化");
}

/**
 * 設置助教選擇模式
 */
function setupTaSelectionMode() {
  const modeSelect = document.getElementById('ta-selection-mode');
  const specificTasContainer = document.getElementById('specific-tas-container');
  const specificTaOpinions = document.getElementById('specific-ta-opinions');
  
  if (!modeSelect || !specificTasContainer || !specificTaOpinions) {
    console.error('找不到助教選擇模式相關元素');
    return;
  }
  
  // 初始化根據當前選擇顯示或隱藏特定助教選擇區
  toggleTaSelectionOptions();
  
  // 監聽選擇變更
  modeSelect.addEventListener('change', toggleTaSelectionOptions);
  
  function toggleTaSelectionOptions() {
    if (modeSelect.value === 'specific') {
      specificTasContainer.classList.remove('hidden');
      specificTaOpinions.classList.remove('hidden');
    } else {
      specificTasContainer.classList.add('hidden');
      specificTaOpinions.classList.add('hidden');
    }
  }
}

/**
 * 從當前頁面獲取助教列表
 */
function fetchTaList() {
  // 顯示處理中狀態
  showStatus('正在獲取助教列表...', false, 0);
  
  // 嘗試從當前頁面獲取助教列表
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs || tabs.length === 0) {
      showStatus('無法獲取當前標籤頁', true);
      return;
    }
    
    const currentTab = tabs[0];
    
    // 檢查是否是助教評價頁面
    if (!currentTab.url.includes('/svta/') && !currentTab.url.includes('TaMain.aspx')) {
      showStatus('當前頁面不是助教評價頁面，無法獲取助教列表', true);
      return;
    }
    
    // 注入腳本獲取助教資訊
    chrome.scripting.executeScript({
      target: {tabId: currentTab.id},
      function: getTaListFromPage
    }).then(results => {
      if (results && results[0] && results[0].result) {
        const fetchedTaList = results[0].result;
        taList = fetchedTaList; // 更新全域變數
        
        // 更新UI中的助教列表
        updateTaListUI(fetchedTaList);
        
        showStatus(`已獲取 ${fetchedTaList.length} 位助教的資訊`);
      } else {
        showStatus('未能獲取助教資訊，請確認頁面已完全載入', true);
      }
    }).catch(error => {
      console.error('獲取助教列表錯誤:', error);
      showStatus('獲取助教列表失敗，請重新嘗試', true);
    });
  });
}

/**
 * 從頁面中獲取助教列表的函數，將被注入到目標頁面執行
 * @returns {Array} 助教資訊列表
 */
function getTaListFromPage() {
  try {
    const taResults = [];
    // 尋找所有助教區塊
    const taBlocks = document.querySelectorAll('#MainContent_TaQuest > main');
    
    taBlocks.forEach((taBlock, index) => {
      const taNameElement = taBlock.querySelector('span[id$="Txt_Name"]');
      const taName = taNameElement ? taNameElement.textContent.trim() : `未知助教 ${index+1}`;
      taResults.push({
        name: taName,
        index: index
      });
    });
    
    return taResults;
  } catch (error) {
    console.error('獲取助教列表時發生錯誤:', error);
    return [];
  }
}

/**
 * 更新UI中的助教列表
 * @param {Array} taList 助教列表
 */
function updateTaListUI(taList) {
  const taListContainer = document.getElementById('ta-list');
  const taOpinionContainers = document.getElementById('ta-opinion-containers');
  
  if (!taListContainer || !taOpinionContainers) {
    console.error('找不到助教列表容器');
    return;
  }
  
  // 清空當前內容
  taListContainer.innerHTML = '';
  taOpinionContainers.innerHTML = '';
  
  if (taList.length === 0) {
    taListContainer.innerHTML = '<div class="notice-text">未獲取到助教資訊，請點擊刷新按鈕</div>';
    return;
  }
  
  // 從儲存的設定中獲取已選擇的助教
  chrome.storage.sync.get(['selected-tas'], function(result) {
    const selectedTAs = result['selected-tas'] || [];
    
    // 為每個助教創建選擇項
    taList.forEach(ta => {
      // 創建助教選擇項
      const taCheckboxLabel = document.createElement('label');
      const taCheckbox = document.createElement('input');
      taCheckbox.type = 'checkbox';
      taCheckbox.name = 'selected-ta';
      taCheckbox.value = ta.name;
      taCheckbox.checked = selectedTAs.includes(ta.name);
      taCheckbox.dataset.taIndex = ta.index;
      
      taCheckboxLabel.appendChild(taCheckbox);
      taCheckboxLabel.appendChild(document.createTextNode(` ${ta.name}`));
      taListContainer.appendChild(taCheckboxLabel);
      
      // 創建助教個別評語輸入區
      const opinionContainer = document.createElement('div');
      opinionContainer.classList.add('ta-opinion-item');
      
      const opinionLabel = document.createElement('label');
      opinionLabel.textContent = `${ta.name} 的評語:`;
      opinionLabel.setAttribute('for', `ta-opinion-${ta.index}`);
      
      const opinionTextarea = document.createElement('textarea');
      opinionTextarea.id = `ta-opinion-${ta.index}`;
      opinionTextarea.name = `ta-opinion-${ta.name}`;
      opinionTextarea.placeholder = `請輸入對助教 ${ta.name} 的評語`;
      opinionTextarea.rows = 3;
      
      // 從儲存的設定中獲取此助教的評語
      chrome.storage.sync.get([`ta-opinion-${ta.name}`], function(result) {
        if (result[`ta-opinion-${ta.name}`]) {
          opinionTextarea.value = result[`ta-opinion-${ta.name}`];
        } else {
          // 如果沒有特定評語，使用通用評語
          chrome.storage.sync.get(['ta-opinion'], function(generalResult) {
            opinionTextarea.value = generalResult['ta-opinion'] || '';
          });
        }
      });
      
      opinionContainer.appendChild(opinionLabel);
      opinionContainer.appendChild(opinionTextarea);
      taOpinionContainers.appendChild(opinionContainer);
    });
    
    // 添加全選/全不選按鈕
    const selectAllContainer = document.createElement('div');
    selectAllContainer.classList.add('select-all-container');
    
    const selectAllBtn = document.createElement('button');
    selectAllBtn.textContent = '全選';
    selectAllBtn.classList.add('small-btn');
    selectAllBtn.addEventListener('click', function() {
      const checkboxes = taListContainer.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = true);
    });
    
    const selectNoneBtn = document.createElement('button');
    selectNoneBtn.textContent = '全不選';
    selectNoneBtn.classList.add('small-btn');
    selectNoneBtn.addEventListener('click', function() {
      const checkboxes = taListContainer.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = false);
    });
    
    selectAllContainer.appendChild(selectAllBtn);
    selectAllContainer.appendChild(selectNoneBtn);
    taListContainer.appendChild(selectAllContainer);
  });
}

/**
 * 設置課外活動顯示/隱藏邏輯
 */
function setupExtracurricularToggle() {
  const ans2Select = document.getElementById('ans2');
  const extraOptions = document.getElementById('extracurricular-options');
  
  if (!ans2Select || !extraOptions) {
    console.error('找不到課外活動相關元素');
    return;
  }
  
  // 初始化根據當前選擇顯示或隱藏課外活動選項
  toggleExtracurricularOptions();
  
  // 監聽選擇變更
  ans2Select.addEventListener('change', toggleExtracurricularOptions);
  
  function toggleExtracurricularOptions() {
    if (ans2Select.value === '1') {  // 如果選擇"是"
      extraOptions.classList.remove('hidden');
    } else {
      extraOptions.classList.add('hidden');
    }
  }
}

/**
 * 設置標籤頁切換功能
 */
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // 切換按鈕樣式
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // 顯示對應的標籤內容
      const tabId = button.getAttribute('data-tab');
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabId) {
          content.classList.add('active');
        }
      });
    });
  });
}

/**
 * 設置所有選項類型切換功能
 */
function setupOptionTypeToggles() {
  // 課程回饋相關選項
  setupTypeToggle('ans1');
  setupTypeToggle('teacher-rating');
  
  // 助教回饋相關選項
  setupTypeToggle('ta-teaching');
  setupTypeToggle('ta-interaction');
}

/**
 * 設置單個選項類型的切換功能
 * @param {string} baseId 選項ID前綴
 */
function setupTypeToggle(baseId) {
  const typeSelector = document.getElementById(`${baseId}-type`);
  const fixedEl = document.getElementById(`${baseId}-fixed`);
  const randomEl = document.getElementById(`${baseId}-random`);
  
  if (!typeSelector || !fixedEl || !randomEl) {
    console.error(`缺少選項元素: ${baseId}`);
    return;
  }
  
  typeSelector.addEventListener('change', () => {
    if (typeSelector.value === 'fixed') {
      fixedEl.classList.remove('hidden');
      randomEl.classList.add('hidden');
    } else {
      fixedEl.classList.add('hidden');
      randomEl.classList.remove('hidden');
    }
  });
}

/****************************
 * 設定管理相關功能
 ****************************/

/**
 * 從 Chrome 儲存區載入設定
 */
function loadSettings() {
  try {
    chrome.storage.sync.get(null, function(items) {
      if (Object.keys(items).length === 0) {
        console.log("未找到已保存的設定，使用默認值");
        return;
      }
      
      console.log("載入儲存的設定", items);
      
      // 載入課程回饋設定
      loadCourseSettings(items);
      
      // 載入助教回饋設定
      loadTaSettings(items);
    });
  } catch (error) {
    console.error("載入設定時發生錯誤:", error);
    showStatus("載入設定失敗", true);
  }
}

/**
 * 載入課程回饋設定
 * @param {Object} items 儲存的設定
 */
function loadCourseSettings(items) {
  // 載入出席狀況設定
  loadOptionSettings('ans1', items);
  
  // 載入課外活動設定
  if (items.ans2) {
    const ans2El = document.getElementById('ans2');
    if (ans2El) ans2El.value = items.ans2;
    
    // 觸發change事件以顯示/隱藏相關選項
    const event = new Event('change');
    ans2El.dispatchEvent(event);
    
    // 如果有保存的課外活動選項，勾選對應選項
    if (items.extraActivities && Array.isArray(items.extraActivities)) {
      const checkboxes = document.querySelectorAll('input[name="extra-activity"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = items.extraActivities.includes(checkbox.value);
      });
    }
  }
  
  // 載入教師評價設定
  loadRatingSettings('teacher-rating', items);
  
  // 載入文字區設定
  if (items.opinion1) document.getElementById('opinion1').value = items.opinion1;
  if (items.opinion2) document.getElementById('opinion2').value = items.opinion2;
}

/**
 * 載入助教回饋設定
 * @param {Object} items 儲存的設定
 */
function loadTaSettings(items) {
  // 載入基本資料
  if (items['ta-attendance']) {
    const el = document.getElementById('ta-attendance');
    if (el) el.value = items['ta-attendance'];
  }
  
  if (items['ta-appearance']) {
    const el = document.getElementById('ta-appearance');
    if (el) el.value = items['ta-appearance'];
  }
  
  // 載入互動次數設定
  loadOptionSettings('ta-interaction', items);
  
  // 載入TA協助事項
  if (items['ta-assistance'] && Array.isArray(items['ta-assistance'])) {
    const checkboxes = document.querySelectorAll('input[name="ta-assistance"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = items['ta-assistance'].includes(checkbox.value);
    });
  }
  
  // 載入TA教學評價設定
  loadRatingSettings('ta-teaching', items);
  
  // 載入TA意見
  if (items['ta-opinion']) {
    document.getElementById('ta-opinion').value = items['ta-opinion'];
  }
  
  // 載入助教選擇模式
  if (items['ta-selection-mode']) {
    const modeSelect = document.getElementById('ta-selection-mode');
    if (modeSelect) {
      modeSelect.value = items['ta-selection-mode'];
      // 觸發change事件以顯示/隱藏相關選項
      const event = new Event('change');
      modeSelect.dispatchEvent(event);
    }
  }
  
  // 注意: 助教個別評語將在助教列表載入時處理
}

/**
 * 載入選項設定
 */
function loadOptionSettings(baseId, items) {
  const typeKey = `${baseId}-type`;
  if (!items[typeKey]) return;

  const typeEl = document.getElementById(typeKey);
  if (!typeEl) return;
  
  typeEl.value = items[typeKey];
  
  // 觸發變更事件以顯示/隱藏對應的輸入區域
  const event = new Event('change');
  typeEl.dispatchEvent(event);
  
  if (items[typeKey] === 'fixed' && items[baseId]) {
    const element = document.getElementById(baseId);
    if (element) element.value = items[baseId];
  } else if (items[typeKey] === 'random' && items[`${baseId}-values`]) {
    // 勾選之前已選的選項
    const checkboxes = document.querySelectorAll(`#${baseId}-random input[type="checkbox"]`);
    checkboxes.forEach(checkbox => {
      checkbox.checked = items[`${baseId}-values`].includes(checkbox.getAttribute('data-value'));
    });
  }
}

/**
 * 載入評價範圍設定
 */
function loadRatingSettings(baseId, items) {
  const typeKey = `${baseId}-type`;
  if (!items[typeKey]) return;
  
  const typeEl = document.getElementById(typeKey);
  if (!typeEl) return;
  
  typeEl.value = items[typeKey];
  
  // 觸發變更事件以顯示/隱藏對應的輸入區域
  const event = new Event('change');
  typeEl.dispatchEvent(event);
  
  if (items[typeKey] === 'fixed') {
    // 使用固定值時，尋找對應的評分選擇框
    // 注意：ta-teaching 的評分選擇框 ID 是 ta-teaching-rating
    const ratingId = baseId === 'ta-teaching' ? `${baseId}-rating` : baseId;
    const element = document.getElementById(ratingId);
    
    if (element && items[baseId]) {
      element.value = items[baseId];
    }
  } else if (items[typeKey] === 'random') {
    // 隨機範圍時
    const minEl = document.getElementById(`${baseId}-min`);
    const maxEl = document.getElementById(`${baseId}-max`);
    
    if (minEl && items[`${baseId}-min`]) minEl.value = items[`${baseId}-min`];
    if (maxEl && items[`${baseId}-max`]) maxEl.value = items[`${baseId}-max`];
  }
}

/**
 * 儲存設定到 Chrome 儲存區
 */
function saveSettings() {
  try {
    const settings = {};
    
    // 儲存課程回饋設定
    saveCourseSettings(settings);
    
    // 儲存助教回饋設定
    saveTaSettings(settings);
    
    // 儲存到 Chrome 儲存區
    chrome.storage.sync.set(settings, function() {
      showStatus('設定已儲存！');
      console.log("設定已儲存", settings);
    });
    
    return settings;
  } catch (error) {
    console.error("儲存設定時發生錯誤:", error);
    showStatus("儲存設定失敗", true);
    return null;
  }
}

/**
 * 儲存課程回饋設定
 * @param {Object} settings 設定物件
 */
function saveCourseSettings(settings) {
  // 儲存出席狀況設定
  saveOptionSettings('ans1', settings);
  
  // 儲存課外活動設定
  const ans2El = document.getElementById('ans2');
  if (ans2El) {
    settings.ans2 = ans2El.value;
    
    // 如果選擇"是"，則保存所選課外活動
    if (ans2El.value === '1') {
      const extraActivities = [];
      const checkboxes = document.querySelectorAll('input[name="extra-activity"]:checked');
      checkboxes.forEach(checkbox => {
        extraActivities.push(checkbox.value);
      });
      settings.extraActivities = extraActivities;
    }
  }
  
  // 儲存教師評價設定
  saveRatingSettings('teacher-rating', settings);
  
  // 儲存文字區設定
  const opinion1El = document.getElementById('opinion1');
  const opinion2El = document.getElementById('opinion2');
  
  if (opinion1El) settings.opinion1 = opinion1El.value;
  if (opinion2El) settings.opinion2 = opinion2El.value;
}

/**
 * 儲存助教回饋設定
 * @param {Object} settings 設定物件
 */
function saveTaSettings(settings) {
  // 儲存基本資料
  const taAttendance = document.getElementById('ta-attendance');
  if (taAttendance) settings['ta-attendance'] = taAttendance.value;
  
  const taAppearance = document.getElementById('ta-appearance');
  if (taAppearance) settings['ta-appearance'] = taAppearance.value;
  
  // 儲存互動次數設定
  saveOptionSettings('ta-interaction', settings);
  
  // 儲存TA協助事項
  const taAssistance = [];
  const assistanceCheckboxes = document.querySelectorAll('input[name="ta-assistance"]:checked');
  assistanceCheckboxes.forEach(checkbox => {
    taAssistance.push(checkbox.value);
  });
  settings['ta-assistance'] = taAssistance;
  
  // 儲存TA教學評價設定
  saveRatingSettings('ta-teaching', settings);
  
  // 儲存TA通用意見
  const taOpinion = document.getElementById('ta-opinion');
  if (taOpinion) settings['ta-opinion'] = taOpinion.value;
  
  // 儲存助教選擇模式
  const taSelectionMode = document.getElementById('ta-selection-mode');
  if (taSelectionMode) settings['ta-selection-mode'] = taSelectionMode.value;
  
  // 儲存選擇的助教列表
  if (taSelectionMode && taSelectionMode.value === 'specific') {
    const selectedTAs = [];
    const taCheckboxes = document.querySelectorAll('input[name="selected-ta"]:checked');
    taCheckboxes.forEach(checkbox => {
      selectedTAs.push(checkbox.value);
    });
    settings['selected-tas'] = selectedTAs;
    
    // 儲存各助教的個別評語
    if (taList && taList.length > 0) {
      taList.forEach(ta => {
        const opinionTextarea = document.getElementById(`ta-opinion-${ta.index}`);
        if (opinionTextarea && opinionTextarea.value) {
          settings[`ta-opinion-${ta.name}`] = opinionTextarea.value;
        }
      });
    }
  } else {
    // 如果選擇全部助教，則清空已選擇的助教列表
    settings['selected-tas'] = [];
  }
}

/**
 * 儲存單選題選項設定
 */
function saveOptionSettings(baseId, settings) {
  const typeEl = document.getElementById(`${baseId}-type`);
  if (!typeEl) return;
  
  const typeValue = typeEl.value;
  settings[`${baseId}-type`] = typeValue;
  
  if (typeValue === 'fixed') {
    const valueEl = document.getElementById(baseId);
    if (valueEl) settings[baseId] = valueEl.value;
  } else {
    // 儲存勾選的選項值
    const values = [];
    const checkboxes = document.querySelectorAll(`#${baseId}-random input[type="checkbox"]:checked`);
    checkboxes.forEach(checkbox => {
      values.push(checkbox.getAttribute('data-value'));
    });
    settings[`${baseId}-values`] = values;
  }
}

/**
 * 儲存評分選項設定
 */
function saveRatingSettings(baseId, settings) {
  const typeEl = document.getElementById(`${baseId}-type`);
  if (!typeEl) return;
  
  const typeValue = typeEl.value;
  settings[`${baseId}-type`] = typeValue;
  
  if (typeValue === 'fixed') {
    // 使用固定值時，尋找對應的評分選擇框
    // 注意：ta-teaching 的評分選擇框 ID 是 ta-teaching-rating
    const ratingId = baseId === 'ta-teaching' ? `${baseId}-rating` : baseId;
    const valueEl = document.getElementById(ratingId);
    
    if (valueEl) {
      settings[baseId] = valueEl.value;
    }
  } else {
    // 隨機範圍時
    const minEl = document.getElementById(`${baseId}-min`);
    const maxEl = document.getElementById(`${baseId}-max`);
    
    if (minEl) settings[`${baseId}-min`] = minEl.value;
    if (maxEl) settings[`${baseId}-max`] = maxEl.value;
  }
}

/**
 * 自動填寫表單
 */
function fillForm() {
  // 顯示處理狀態
  showStatus('正在處理...', false, 0);
  
  try {
    // 保存最新設定
    saveSettings();
    
    // 執行內容腳本
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || tabs.length === 0) {
        showStatus('無法獲取當前標籤頁', true);
        return;
      }
      
      // 檢查當前頁面是否為教學意見調查還是助教意見調查
      const url = tabs[0].url;
      let scriptName = 'content.js';
      
      // 如果是助教意見調查頁面，則使用助教專用腳本
      if (url.includes('/svta/') || url.includes('TaMain.aspx')) {
        scriptName = 'content-ta.js';
        showStatus('正在填寫助教意見調查表單...', false, 0);
      } else {
        showStatus('正在填寫課程意見調查表單...', false, 0);
      }
      
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: [scriptName]
      }).then(() => {
        showStatus('表單填寫指令已發送！');
      }).catch(error => {
        console.error('執行填寫表單時發生錯誤:', error);
        showStatus(`執行失敗：${error.message}`, true);
      });
    });
  } catch (error) {
    console.error("填寫表單時發生錯誤:", error);
    showStatus("填寫表單失敗", true);
  }
}

/**
 * 顯示狀態訊息
 * @param {string} message 要顯示的訊息
 * @param {boolean} isError 是否為錯誤訊息
 * @param {number} timeout 訊息顯示時間(毫秒)，0表示不自動消失
 */
function showStatus(message, isError = false, timeout = null) {
  const status = document.getElementById('status');
  if (!status) return;
  
  status.textContent = message;
  
  if (isError) {
    status.style.color = '#f44336';
  } else {
    status.style.color = '#4CAF50';
  }
  
  if (timeout !== 0) {
    const duration = timeout || (isError ? UI.STATUS_TIMEOUT.ERROR : UI.STATUS_TIMEOUT.SUCCESS);
    
    setTimeout(() => {
      status.textContent = '';
    }, duration);
  }
}