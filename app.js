// app.js - 统一的JavaScript文件
// 增加保存时间，完成时间显示
const STORAGE_KEY = 'myTodoApp_tasks_woyaofangzhichongming_v1';
let tasks = [];
let lastUpdateTime = 0;
let saveTimeout = null;
let isSaving = false;
let pendingSave = false;

// 初始化应用
function initApp() {
    loadTasksFromLocalStorage();
    renderTasks();
    setupEventListeners();
    // 页面加载完成后聚焦输入框
    document.getElementById('taskInput').focus();
}

// 设置事件监听器
function setupEventListeners() {
    // 输入框回车事件
    document.getElementById('taskInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();//防止表单提交
            addTask();
        }
    });

    // 存储变化监听
    window.addEventListener('storage', function(e) {
        if (e.key === STORAGE_KEY) {
            console.log('检测到存储变化，同步数据...');
            loadTasksFromLocalStorage(true);
        }
    });

    window.addEventListener('beforeunload', function() {
        // 如果还有未保存的更改，立即保存
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTasksToLocalStorage();
        }
    });
}

// 存储相关函数
function saveTasksToLocalStorage() {//本地存储
    const saveData = {
        tasks: tasks,
        lastUpdate: Date.now(),
        version: '1.0'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    console.log('保存任务：', tasks);
}
function loadTasksFromLocalStorage(isSync = false) {//本地读取
    try {
        const savedTasks = localStorage.getItem(STORAGE_KEY);
        console.log('从本地存储读取的数据：', savedTasks);
        
        if (savedTasks) {
            const data = JSON.parse(savedTasks);
            console.log('解析后的任务数组:', data);
            
            // 验证数据格式
            if (!data.tasks || !Array.isArray(data.tasks)) {
                throw new Error('数据格式错误');
            }
            
            if (data.lastUpdate > lastUpdateTime) {
                tasks = data.tasks;
                lastUpdateTime = data.lastUpdate;
                renderTasks();
                
                if (isSync) {
                    showNotification('数据已从其他页面更新', 'info');
                }
            }
        } else {
            console.log('本地存储中没有找到数据');
            tasks = [];
        }
    } catch (error) {
        console.error('加载数据失败:', error);
        showNotification('加载数据失败，已重置', 'error');
        tasks = [];
        lastUpdateTime = 0;
        renderTasks();
    }
}

// 通知功能
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 时间格式
function formatDataTime(iosString){// 格式化时间函数
    const date=new Date(iosString);
    return date.toLocaleString('zh-ch',{
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    })
}
function formatTimeAgo(isoString) {// 更简洁的"多久前"格式
    const now = new Date();
    const created = new Date(isoString);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    // 超过一周显示具体日期
    // return created.toLocaleDateString('zh-CN');
    return formatDataTime(isoString);
}

// 任务管理函数
function addTask(){//添加任务
    const taskInput = document.getElementById('taskInput');
    const taskText = taskInput.value.trim();
    
    if(taskText == ''){
        // alert("任务内容不可为空");
        showNotification('任务内容不可为空', 'warning');
        return;
    }
    
    const newTask = {
        id: Date.now(),
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    taskInput.value = '';
    renderTasks();
    debouncedSave(); // 只在添加时保存
}
function renderTasks(){//渲染任务栏
    const taskList = document.getElementById("taskList");
    taskList.innerHTML = '';
    
    if (tasks.length === 0) {
        taskList.innerHTML = '<div class="empty-state">🎉 没有任务，享受空闲时光！</div><div class="empty-state" style="font-size: 14px;">添加第一个任务开始吧</div>';
        updateStats();
        return;
    }
    
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item';

        if(task.completed) li.classList.add('task-completed');
        else li.classList.add('task-pending');
        
        // 任务内容容器
        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';
        
        // 任务文本
        const textSpan = document.createElement('span');
        textSpan.className = 'task-text';
        textSpan.textContent = task.text;
        
        // 创建时间 - 新增！
        const timeSpan = document.createElement('span');
        timeSpan.className = 'task-time';
        // 处理可能缺失的 createdAt 字段
        if (task.completed && task.updatedAt) {
            timeSpan.textContent = `完成于：${formatTimeAgo(task.updatedAt)}`;
            timeSpan.title = new Date(task.updatedAt).toLocaleString('zh-CN');
        } else if (task.createdAt) {
            if (task.createdAt) {
                // timeSpan.textContent = formatTimeAgo(task.createdAt);
                timeSpan.textContent = `创建于：${formatTimeAgo(task.createdAt)}`;
                timeSpan.title = new Date(task.createdAt).toLocaleString('zh-CN');
            } else {
                // 兼容旧数据
                timeSpan.textContent = '刚刚';
                timeSpan.title = '创建时间未知';
            }
        }
        taskContent.appendChild(textSpan);
        taskContent.appendChild(timeSpan);
        
        const actions = document.createElement('div');
        actions.className = 'task-actions';

        const completeBtn = document.createElement('button');
        completeBtn.className = 'btn btn-complete';
        completeBtn.textContent = task.completed ? '已完成' : '标记完成';
        completeBtn.onclick = () => toggleTask(task.id);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-delete';
        deleteBtn.textContent = '删除';
        deleteBtn.onclick = () => deleteTask(task.id);
        
        actions.appendChild(completeBtn);
        actions.appendChild(deleteBtn);
        li.appendChild(taskContent);
        li.appendChild(actions);
        taskList.appendChild(li);
    });
    
    updateStats();
}
function toggleTask(taskId){//单个任务完成与否状态切换
    tasks = tasks.map(task => {
        if(task.id === taskId){
            return {...task, completed: !task.completed, updatedAt: new Date().toISOString()};
        }
        return task;
    });
    renderTasks();
    debouncedSave(); // 在状态改变时保存
}
function deleteTask(taskId){//删除任务
    if (confirm('确定要删除这个任务吗？')) {
        tasks = tasks.filter(task => task.id !== taskId);
        renderTasks();
        debouncedSave(); // 在删除时保存
    }
}
function updateStats() {//任务计数更新
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const statsElement = document.getElementById('taskStats');
    
    statsElement.innerHTML = `
        总计: ${totalTasks} 个任务 | 
        已完成: ${completedTasks} | 
        未完成: ${totalTasks - completedTasks}
    `;
}

//保存（防抖）
function debouncedSave(immediate = false) {
    // 如果正在保存中，标记需要再次保存
    if (isSaving) {
        pendingSave = true;
        return;
    }
    // 清除之前的定时器
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    if (immediate) {
        // 立即保存（用于重要操作）
        performSave();
    } else {
        // 延迟保存
        saveTimeout = setTimeout(() => {
            performSave();
        }, 500);
    }
}
function performSave() {
    isSaving = true;
    
    try {
        saveTasksToLocalStorage();
    } catch (error) {
        console.error('保存失败:', error);
        showNotification('保存失败', 'error');
    } finally {
        isSaving = false;
        // 检查是否有等待的保存请求
        if (pendingSave) {
            pendingSave = false;
            debouncedSave(true); // 立即执行等待的保存
        }
    }
}

//导入导出
function exportData() {// 导出数据
    if (tasks.length === 0) {
        showNotification('没有任务可以导出', 'warning');
        return;
    }
    
    try {
        // 准备导出数据
        const exportData = {
            tasks: tasks,
            exportTime: new Date().toISOString(),
            totalTasks: tasks.length,
            completedTasks: tasks.filter(task => task.completed).length,
            version: '1.0',
            app: '我的待办事项'
        };
        
        // 创建数据字符串
        const dataStr = JSON.stringify(exportData, null, 2);
        
        // 创建Blob对象
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        // 创建下载链接
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        
        // 设置文件名（包含日期）
        const dateStr = new Date().toISOString().split('T')[0];
        link.download = `待办事项备份_${dateStr}.json`;
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 释放URL对象
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
        
        showNotification('数据导出成功', 'success');
        console.log('导出数据:', exportData);
    } catch (error) {
        console.error('导出数据失败:', error);
        showNotification('导出数据失败', 'error');
    }
}
function importData(event) {// 导入数据
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }
    
    // 验证文件类型
    if (!file.name.endsWith('.json')) {
        showNotification('请选择JSON格式的文件', 'error');
        // 重置文件输入
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // 验证数据格式
            if (!isValidTaskData(importedData)) {
                showNotification('文件格式不正确', 'error');
                // 重置文件输入
                event.target.value = '';
                return;
            }
            
            // 确认导入
            if (confirm(`确定要导入 ${importedData.tasks.length} 个任务吗？这将覆盖当前的所有任务。`)) {
                // 导入数据
                tasks = importedData.tasks;
                lastUpdateTime = Date.now();
                
                // 更新界面和存储
                renderTasks();
                saveTasksToLocalStorage();
                
                showNotification(`成功导入 ${tasks.length} 个任务`, 'success');
                console.log('导入的数据:', importedData);
            }
        } catch (error) {
            console.error('导入数据失败:', error);
            showNotification('文件解析失败，请检查文件格式', 'error');
        }
        
        // 无论成功与否，都重置文件输入
        event.target.value = '';
    };
    
    reader.onerror = function() {
        showNotification('读取文件失败', 'error');
        event.target.value = '';
    };
    
    reader.readAsText(file);
}
function isValidTaskData(data) {//验证导入的任务数据格式
    // 检查基本结构
    if (!data || typeof data !== 'object') {
        return false;
    }
    
    // 检查tasks数组
    if (!data.tasks || !Array.isArray(data.tasks)) {
        return false;
    }
    
    // 检查每个任务对象的格式
    for (const task of data.tasks) {
        if (!task || typeof task !== 'object') {
            return false;
        }
        
        // 检查必需字段
        if (typeof task.id !== 'number' || 
            typeof task.text !== 'string' || 
            typeof task.completed !== 'boolean') {
            return false;
        }
        
        // 文本不能为空
        if (task.text.trim() === '') {
            return false;
        }

        if (!task.createdAt)return false;//确保有这个字段

    }
    
    return true;
}
function importFromText() {//从文本导入数据（备用方法，可以直接粘贴JSON）
    const jsonText = prompt('请粘贴JSON数据:');
    
    if (!jsonText) {
        return;
    }
    
    try {
        const importedData = JSON.parse(jsonText);
        
        if (!isValidTaskData(importedData)) {
            showNotification('数据格式不正确', 'error');
            return;
        }
        
        if (confirm(`确定要导入 ${importedData.tasks.length} 个任务吗？这将覆盖当前的所有任务。`)) {
            tasks = importedData.tasks;
            lastUpdateTime = Date.now();
            
            renderTasks();
            saveTasksToLocalStorage();
            
            showNotification(`成功导入 ${tasks.length} 个任务`, 'success');
        }
    } catch (error) {
        console.error('导入数据失败:', error);
        showNotification('数据解析失败，请检查格式', 'error');
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

// 添加一些工具函数到全局，方便调试
window.debugTasks = function() {
    console.log('当前任务:', tasks);
    console.log('最后更新时间:', lastUpdateTime);
    console.log('本地存储数据:', localStorage.getItem(STORAGE_KEY));
};
// // 添加导入导出函数到全局，方便测试
// window.exportData = exportData;
// window.importData = importData;
// window.importFromText = importFromText;
