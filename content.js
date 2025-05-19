(function() {
  if (window.ntuFormFillerInitialized) {
    clearNotifications();
  }
  window.ntuFormFillerInitialized = true;

  const DEFAULT_CONFIGS = {
    ans1: "2",
    ans2: "1",
    ans3: "3",
    ans4: "3",
    'teacher-rating': "5",
    'ta-rating': "5",
    opinion1: "1. 課程內容充實，教學方式清楚\n2. 有助於提升相關領域的理解與興趣\n3. 能啟發深入思考與自主學習",
    opinion2: "1. 若能提供更多實例或延伸教材會更好\n2. 建議課程節奏稍作調整以利吸收"
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
    const notificationId = 'ntu-form-notification';
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
    processOption('ans1', settings, processedSettings);
    processedSettings.ans2 = settings.ans2 || DEFAULT_CONFIGS.ans2;
    if (settings.ans2 === '1' && settings.extraActivities && settings.extraActivities.length > 0) {
      processedSettings.extraActivities = settings.extraActivities;
    }
    processRating('teacher-rating', settings, processedSettings);
    processRating('ta-rating', settings, processedSettings);
    if (settings.opinion1) processedSettings.opinion1 = settings.opinion1;
    if (settings.opinion2) processedSettings.opinion2 = settings.opinion2;
    processedSettings['selected-tas'] = settings['selected-tas'] || [];
    return processedSettings;
  }

  function processOption(baseId, settings, processedSettings) {
    const typeKey = `${baseId}-type`;
    if (settings[typeKey] === 'fixed') {
      processedSettings[baseId] = settings[baseId];
    } else if (settings[typeKey] === 'random') {
      const values = settings[`${baseId}-values`];
      if (values && values.length > 0) {
        const randomIndex = Math.floor(Math.random() * values.length);
        processedSettings[baseId] = values[randomIndex];
      }
    }
  }

  function processRating(baseId, settings, processedSettings) {
    const typeKey = `${baseId}-type`;
    if (settings[typeKey] === 'fixed') {
      processedSettings[baseId] = settings[baseId];
    } else if (settings[typeKey] === 'random') {
      const min = parseInt(settings[`${baseId}-min`]);
      const max = parseInt(settings[`${baseId}-max`]);
      if (!isNaN(min) && !isNaN(max) && min <= max) {
        processedSettings[baseId] = String(Math.floor(Math.random() * (max - min + 1)) + min);
      }
    }
  }

  function fillForm(userSettings) {
    const originalCheckTAN = window.checkTA_N;
    window.checkTA_N = function() {
      return false;     
    };

    window.processedSettings = userSettings;
    const answers = buildAnswersObject(userSettings);
    const stats = {
      total: Object.keys(answers).length,
      filled: 0,
      textareas: 0
    };
    fillRadioOptions(answers, stats);
    fillCheckboxes(stats);
    fillTextareas(userSettings, stats);
    fillMultipleTaRatings(userSettings, stats);
    showResults(stats);

    if (originalCheckTAN) {
      window.checkTA_N = originalCheckTAN;
    }
  }

  function buildAnswersObject(settings) {
    return {
      ans1: settings.ans1 || DEFAULT_CONFIGS.ans1,
      ans2: settings.ans2 || DEFAULT_CONFIGS.ans2,
      ans3: DEFAULT_CONFIGS.ans3,
      ans4: DEFAULT_CONFIGS.ans4,
      ans9: settings['teacher-rating'] || DEFAULT_CONFIGS['teacher-rating'],
      ans10: settings['teacher-rating'] || DEFAULT_CONFIGS['teacher-rating'],
      ans11: settings['teacher-rating'] || DEFAULT_CONFIGS['teacher-rating'],
      ans12: settings['teacher-rating'] || DEFAULT_CONFIGS['teacher-rating'],
      ans13: settings['teacher-rating'] || DEFAULT_CONFIGS['teacher-rating']
    };
  }

  function fillRadioOptions(answers, stats) {
    for (const [name, value] of Object.entries(answers)) {
      const selector = `input[type="radio"][name="${name}"][value="${value}"]`;
      const radio = document.querySelector(selector);
      if (radio) {
        radio.checked = true;
        
        if (name === "ans2") {
          try {
            if (value === "1") {
              const homeworkDiv = document.getElementById('homework');
              if (homeworkDiv) homeworkDiv.style.display = 'block';
            } else {
              const homeworkDiv = document.getElementById('homework');
              if (homeworkDiv) homeworkDiv.style.display = 'none';
            }
          } catch(e) {
            console.error("處理課外活動顯示邏輯時出錯:", e);
          }
        } else {
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        stats.filled++;
      }
    }
  }

  function fillCheckboxes(stats) {
    const ans2Radio = document.querySelector('input[type="radio"][name="ans2"][value="1"]');
    if (ans2Radio && ans2Radio.checked) {
      const userSettings = window.processedSettings || {};
      const extraActivities = userSettings.extraActivities || [];
      const activityMapping = {
        "做習題": { name: "homework", value: "1", id: "rd_211" },
        "寫報告": { name: "homework", value: "2", id: "rd_212" },
        "準備口頭報告": { name: "homework", value: "3", id: "rd_213" },
        "閱讀心得": { name: "homework", value: "4", id: "rd_214" },
        "專案研究": { name: "homework", value: "5", id: "rd_215" },
        "作品或展演": { name: "homework", value: "6", id: "rd_216" },
        "準備隨堂測驗": { name: "homework", value: "7", id: "rd_217" },
        "其他": { name: "homework", value: "8", id: "rd_218" }
      };
      if (extraActivities.length > 0) {
        let checkedCount = 0;
        extraActivities.forEach(activity => {
          const mapping = activityMapping[activity];
          if (mapping) {
            let checkbox = document.getElementById(mapping.id);
            if (!checkbox) {
              checkbox = document.querySelector(`input[type="checkbox"][name="${mapping.name}"][value="${mapping.value}"]`);
            }
            if (checkbox) {
              checkbox.checked = true;
              checkbox.dispatchEvent(new Event('change', { bubbles: true }));
              checkedCount++;
            }
          }
        });
        if (checkedCount > 0) stats.filled++;
      } else {
        const defaultId = "rd_211";
        let defaultCheckbox = document.getElementById(defaultId);
        if (!defaultCheckbox) {
          defaultCheckbox = document.querySelector('input[type="checkbox"][name="homework"][value="1"]');
        }
        if (defaultCheckbox) {
          defaultCheckbox.checked = true;
          defaultCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
          stats.filled++;
        }
      }
    }
  }

  function fillTextareas(settings, stats) {
    const textareas = {
      opinion1: settings.opinion1 || DEFAULT_CONFIGS.opinion1,
      opinion2: settings.opinion2 || DEFAULT_CONFIGS.opinion2
    };
    for (const [name, content] of Object.entries(textareas)) {
      const textarea = document.querySelector(`textarea[name="${name}"]`);
      if (textarea) {
        textarea.value = content;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        stats.textareas++;
      }
    }
  }

  function fillMultipleTaRatings(settings, stats) {
    const rating = settings['ta-rating'] || DEFAULT_CONFIGS['ta-rating'];
    const selectedTAs = settings['selected-tas'] || [];
    
    const taBlocks = document.querySelectorAll('.row:has(.ta-name-hits)');
    if (!taBlocks || taBlocks.length === 0) {
      console.log("✓ 未找到助教評價區塊或此課程沒有助教");
      return;
    }
    
    console.log(`✓ 找到 ${taBlocks.length} 位助教評價區塊`);
    let taCount = 0;
    
    taBlocks.forEach((block, index) => {
      const taNameElement = block.querySelector('.ta-name-hits');
      if (!taNameElement) return;
      
      const taName = taNameElement.textContent.trim();
      const taIndex = index + 1;
      
      if (selectedTAs && selectedTAs.length > 0 && !selectedTAs.includes(taName)) {
        console.log(`✓ 跳過未選擇的助教: ${taName}`);
        return;
      }
      
      const radioGroup = block.querySelectorAll('input[type="radio"]');
      if (radioGroup.length > 0) {
        const radioName = radioGroup[0].name;
        const ratingSelector = `input[type="radio"][name="${radioName}"][value="${rating}"]`;
        const radio = block.querySelector(ratingSelector);
        
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          radio.dispatchEvent(new Event('click', { bubbles: true }));
          taCount++;
          stats.filled++;
          console.log(`✓ 已評價助教 ${taName}: ${rating} 分`);
        }
      }
    });
    
    if (taCount > 0) {
      console.log(`✓ 已完成 ${taCount} 位助教的評價`);
    }
  }

  function showResults(stats) {
    const message = `已自動填寫 ${stats.filled} 個選項，請檢查結果`;
    showNotification(message, "success");
  }

  function showNotification(message, type = "success") {
    const notificationId = 'ntu-form-notification';
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
