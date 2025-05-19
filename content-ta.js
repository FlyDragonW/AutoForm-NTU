(function() {
  if (window.ntuTaFormFillerInitialized) {
    clearNotifications();
  }
  window.ntuTaFormFillerInitialized = true;

  const DEFAULT_CONFIGS = {
    'ta-attendance': "A15",
    'ta-appearance': "A25",
    'ta-interaction': "A35",
    'ta-assistance': ['A401', 'A402', 'A404'],
    'ta-teaching': "5",
    'ta-opinion': "TA非常熱心協助同學解決課堂問題，批改作業也很仔細，給予的回饋十分有幫助。課堂上的補充說明和口語練習指導讓我獲益良多。"
  };

  const UI = {
    NOTIFICATION: {
      SUCCESS_COLOR: '#4CAF50',
      ERROR_COLOR: '#f44336',
      DURATION: 5000
    }
  };

  loadUserSettings()
    .then(fillForm)
    .catch(error => {
      console.error("❌ 發生錯誤:", error);
      showNotification("填寫表單時發生錯誤，請檢查控制台", "error");
    });

  function clearNotifications() {
    const notificationId = 'ntu-ta-form-notification';
    let notificationDiv = document.getElementById(notificationId);
    if (notificationDiv) {
      notificationDiv.remove();
    }
  }

  function loadUserSettings() {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.sync.get(null, function(settings) {
          const processedSettings = processSettings(settings);
          resolve(processedSettings);
        });
      } catch (error) {
        console.error("❌ 無法載入設定:", error);
        resolve({});
      }
    });
  }

  function processSettings(settings) {
    const processedSettings = {};
    processedSettings['ta-attendance'] = settings['ta-attendance'] || DEFAULT_CONFIGS['ta-attendance'];
    processedSettings['ta-appearance'] = settings['ta-appearance'] || DEFAULT_CONFIGS['ta-appearance'];
    processOptionForTa(settings, processedSettings, 'ta-interaction');
    processedSettings['ta-assistance'] = settings['ta-assistance'] || DEFAULT_CONFIGS['ta-assistance'];
    processRatingForTa(settings, processedSettings);
    processedSettings['ta-opinion'] = settings['ta-opinion'] || DEFAULT_CONFIGS['ta-opinion'];
    processedSettings['selected-tas'] = settings['selected-tas'] || [];
    return processedSettings;
  }

  function processOptionForTa(settings, processedSettings, baseId) {
    const typeKey = `${baseId}-type`;
    if (settings[typeKey] === 'fixed') {
      processedSettings[baseId] = settings[baseId] || DEFAULT_CONFIGS[baseId];
    } else if (settings[typeKey] === 'random' && settings[`${baseId}-values`]) {
      const values = settings[`${baseId}-values`];
      if (values.length > 0) {
        const randomIndex = Math.floor(Math.random() * values.length);
        processedSettings[baseId] = values[randomIndex];
      } else {
        processedSettings[baseId] = DEFAULT_CONFIGS[baseId];
      }
    } else {
      processedSettings[baseId] = DEFAULT_CONFIGS[baseId];
    }
  }

  function processRatingForTa(settings, processedSettings) {
    const baseId = 'ta-teaching';
    const typeKey = `${baseId}-type`;
    if (settings[typeKey] === 'fixed') {
      processedSettings[baseId] = settings[baseId] || DEFAULT_CONFIGS['ta-teaching'];
    } else if (settings[typeKey] === 'random') {
      const min = parseInt(settings[`${baseId}-min`]);
      const max = parseInt(settings[`${baseId}-max`]);
      if (!isNaN(min) && !isNaN(max) && min <= max) {
        processedSettings[baseId] = String(Math.floor(Math.random() * (max - min + 1)) + min);
      } else {
        processedSettings[baseId] = DEFAULT_CONFIGS['ta-teaching'];
      }
    } else {
      processedSettings[baseId] = DEFAULT_CONFIGS['ta-teaching'];
    }
  }

  function fillForm(userSettings) {
    const taBlocks = document.querySelectorAll('#MainContent_TaQuest > main');
    if (!taBlocks || taBlocks.length === 0) {
      console.error("❌ 找不到助教評價區塊");
      showNotification("找不到助教評價區塊，請確認頁面是否正確", "error");
      return;
    }

    const selectedTAs = userSettings['selected-tas'];
    let processedCount = 0;

    taBlocks.forEach((taBlock, index) => {
      const taNameElement = taBlock.querySelector('span[id$="Txt_Name"]');
      const taName = taNameElement ? taNameElement.textContent.trim() : `未知助教 ${index+1}`;
      if (!selectedTAs || selectedTAs.length === 0 || selectedTAs.includes(taName)) {
        const yesRadio = taBlock.querySelector('input[id$="Rbtn1"]');
        if (yesRadio) {
          yesRadio.checked = true;
          yesRadio.dispatchEvent(new Event('change', { bubbles: true }));
          yesRadio.dispatchEvent(new Event('click', { bubbles: true }));
          fillTaForm(taBlock, userSettings, taName);
          processedCount++;
        }
      } else {
        const noRadio = taBlock.querySelector('input[id$="Rbtn2"]');
        if (noRadio) {
          noRadio.checked = true;
          noRadio.dispatchEvent(new Event('change', { bubbles: true }));
          noRadio.dispatchEvent(new Event('click', { bubbles: true }));
        }
      }
    });

    if (processedCount > 0) {
      showNotification(`已填寫 ${processedCount} 位助教的評價表單，請檢查並提交`, "success");
    } else {
      showNotification("沒有填寫任何助教評價，請檢查設定", "error");
    }
  }

  function fillTaForm(taBlock, settings, taName) {
    fillBasicInfo(taBlock, settings, taName);
    fillTeachingRating(taBlock, settings, taName);
    fillOpinion(taBlock, settings, taName);
  }

  function fillBasicInfo(taBlock, settings, taName) {
    const attendanceValue = settings['ta-attendance'] || DEFAULT_CONFIGS['ta-attendance'];
    const attendanceRadio = taBlock.querySelector(`input[id$="${attendanceValue}"]`);
    if (attendanceRadio) {
      attendanceRadio.checked = true;
      attendanceRadio.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const appearanceValue = settings['ta-appearance'] || DEFAULT_CONFIGS['ta-appearance'];
    const appearanceRadio = taBlock.querySelector(`input[name$="A2"][value="${appearanceValue}"]`);
    if (appearanceRadio) {
      appearanceRadio.checked = true;
      appearanceRadio.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const interactionValue = settings['ta-interaction'] || DEFAULT_CONFIGS['ta-interaction'];
    const interactionRadio = taBlock.querySelector(`input[name$="A3"][value="${interactionValue}"]`);
    if (interactionRadio) {
      interactionRadio.checked = true;
      interactionRadio.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const assistanceItems = settings['ta-assistance'] || DEFAULT_CONFIGS['ta-assistance'];
    assistanceItems.forEach(item => {
      const checkbox = taBlock.querySelector(`input[type="checkbox"][id$="${item}"]`) ||
                        taBlock.querySelector(`input[type="checkbox"][name$="${item}"]`);
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  function fillTeachingRating(taBlock, settings, taName) {
    const rating = settings['ta-teaching'] || DEFAULT_CONFIGS['ta-teaching'];
    for (let i = 1; i <= 4; i++) {
      const optionSelector = `input[type="radio"][name$="Q${i}"][value$="${i}${rating}"]`;
      const radio = taBlock.querySelector(optionSelector);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  function fillOpinion(taBlock, settings, taName) {
    let opinionText = settings['ta-opinion'] || DEFAULT_CONFIGS['ta-opinion'];
    if (settings[`ta-opinion-${taName}`]) {
      opinionText = settings[`ta-opinion-${taName}`];
    }
    const textarea = taBlock.querySelector('textarea[id$="TxtFloat"]');
    if (textarea) {
      textarea.value = opinionText;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function showNotification(message, type = "success") {
    const notificationId = 'ntu-ta-form-notification';
    let notificationDiv = document.getElementById(notificationId);
    if (notificationDiv) {
      notificationDiv.remove();
    }
    notificationDiv = document.createElement('div');
    notificationDiv.id = notificationId;
    Object.assign(notificationDiv.style, {
      position: 'fixed',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: type === "success" ? UI.NOTIFICATION.SUCCESS_COLOR : UI.NOTIFICATION.ERROR_COLOR,
      color: 'white',
      padding: '10px 20px',
      borderRadius: '4px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      zIndex: '10000',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center'
    });
    notificationDiv.textContent = message;
    document.body.appendChild(notificationDiv);
    setTimeout(() => {
      if (notificationDiv && notificationDiv.parentNode) {
        notificationDiv.remove();
      }
    }, UI.NOTIFICATION.DURATION);
  }
})();
