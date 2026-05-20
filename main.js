import '@fortawesome/fontawesome-free/css/all.min.css';
import { Chart, registerables } from 'chart.js';
import Tesseract from 'tesseract.js';
import { metaboliteData, categoryNames, subtypes, LANGUAGES } from './config.js';
import { initTheme, initAccessibility, initKeyboardNavigation, toggleTheme } from './theme.js';

Chart.register(...registerables);
window.Chart = Chart;
window.Tesseract = Tesseract;
window.metaboliteData = metaboliteData;
window.categoryNames = categoryNames;
window.subtypes = subtypes;
window.LANGUAGES = LANGUAGES;

if (typeof window.currentSelectedDoctor === 'undefined') window.currentSelectedDoctor = null;
if (typeof window.currentSelectedPatient === 'undefined') window.currentSelectedPatient = null;
if (typeof window.replyingToMessage === 'undefined') window.replyingToMessage = null;
if (typeof window._currentReportData === 'undefined') window._currentReportData = null;
import { initI18n } from './i18n.js';
import { checkLoginStatus, setupActivityTracking, login, register, logout, toggleForm, resetPassword, changePassword, toggleDropdown, startSessionTimeout, updateActivity, saveUserProfile, togglePasswordVisibility } from './auth.js';
import { showNotification, toggleNotifications, loadNotifications, addNotification, clearAllNotifications, updateNotificationBadge, checkForNewNotifications, startNotificationCheck } from './notifications.js';
import { showTab, switchDataSubTab, toggleGlobalSearch, closeGlobalSearch, performGlobalSearch } from './navigation.js';
import { FeedbackSystem, openFeedbackModal, closeFeedbackModal, captureFeedbackScreenshot, submitFeedback, selectRating, skipRating, submitRating } from './feedback.js';
import { showDoctorDashboard, closeConfirmation, toggleSoundFeedback } from './doctor.js';
import { updateComparisonView, setComparisonTimeRange, drawTrendChart, drawDimensionTrendChart, drawCorrelationHeatmap, calcPearsonCorrelation, computeLinearRegression } from './visualization.js';
import { generateReport, generateConcentrationReport } from './visualization.js';
import { generateWeeklyHealthPlan, generate4WeekExercisePlan, saveToHistory, refreshSuggestions, openQuickRecord, closeQuickRecord, saveQuickRecord } from './health-plans.js';
import { initWizard, wizardNext, wizardPrev, wizardSkip, setWizardDate, loadSampleData, clearData, wizardSubmit, autoSaveDraft, closeMetabolicPreview, confirmMetabolicSave, filterMetabolicHistory, exportMetabolicCSV } from './wizard.js';
import { exportComparisonReport, exportToPDF, updateTrendChart } from './reports.js';
import {
    exportHealthReport,
    exportElementToPDF as pdfExportElementToPDF,
    exportHTMLToPDF as pdfExportHTMLToPDF,
    saveReportAsPDF as pdfSaveReportAsPDF,
    exportReportAsWord as pdfExportReportAsWord,
    exportReportAsExcel as pdfExportReportAsExcel,
    exportReportPDF as pdfExportReportPDF,
    showExportMenu as pdfShowExportMenu,
    closeExportMenu as pdfCloseExportMenu,
    exportComparisonReport as pdfExportComparisonReport,
    exportElementToPDFLegacy as pdfExportElementToPDFLegacy,
    exportHTMLToPDFLegacy as pdfExportHTMLToPDFLegacy,
    generateShareLink as pdfGenerateShareLink,
    generateShareId as pdfGenerateShareId,
    generateSharePassword as pdfGenerateSharePassword,
    scrollToSection as pdfScrollToSection
} from './pdf-export.js';
import { observeChart, disconnectAllChartObservers, VirtualList, limitHistoricalData, hasMoreData, debounce, renderWithObserver, createPatientVirtualList, showHistoryLimitBadge } from './performance.js';
import {
    initAccessibilityEnhancements, trapFocus, announce,
    announceLoading, announceError, announceSuccess,
    addSkipToContentLink, initFocusRingManagement,
    initRovingTabindex, injectARIALandmarks, injectAriaExpandedOnToggles,
    associateFormErrors, setElementLoading, ensureAriaLabels,
    runA11yAudit, getLatestAuditResult, generateA11ySummaryHTML
} from './accessibility.js';
import { PatientGroupManager, BatchOperations, MultiPatientComparison } from './patient-groups.js';
import {
    initInterventionStore, getAllInterventions, addIntervention, updateIntervention,
    deleteIntervention, publishIntervention, reviewIntervention, queryInterventions,
    getCategoryStats, getVersionHistoryForId, resetToDefaults
} from './intervention-store.js';
import { generateDynamicRecommendations, getCombinedRecommendations, getReviewQueue,
    approveRecommendations, rejectRecommendations, modifyRecommendation,
    getPendingReviewCount, getRecommendationStats, getAuditTrailForPatient
} from './recommendation-engine.js';
import { renderInterventionEditor } from './intervention-editor.js';
import { quickAddFood, searchFoodDatabase, filterFoodCategory, saveWeightGoal } from './diet.js';
import { showPlaceholderAvatar, triggerAvatarInteraction } from './avatar.js';
import { toggleAIChat, openAIChat, closeAIChat, sendChatMessage } from './ai-chat.js';
import { initImageViewer } from './image-viewer.js';
import { toggleTutorial, openTutorial, closeTutorial, startOnboarding, checkFirstVisit } from './tutorial.js';
import { initHealthFab, showHealthFab, hideHealthFab } from './health-fab.js';
import { initParticleBackground, initScrollReveal } from './visual-effects.js';
import { setMood, openHeightWeightInput, closeHeightWeightModal, saveHeightWeight, openGoalsModal, closeGoalsModal, saveGoals } from './modals.js';
import { isRememberEnabled, autoFillLoginForm, getStorageDiagnostics } from './auth-persistence.js';
import { analyzeMetabolicData as aiAnalyze, enableAIDiagnosis, disableAIDiagnosis, isAIEnabled } from './diagnosis-engine.js';
import { matchFingerprints } from './analysis.js';
window.matchFingerprints = matchFingerprints;
import { getAIMetrics } from './ai-diagnosis.js';
import {
    loadPatientPrescriptions,
    loadChatMessages,
    loadChatMessagesWithDoctor,
    loadDoctorList,
    loadReportAccessStatus,
    selectDoctor,
    updateReportAccessUI,
    sendMessage,
    sendDoctorMessage,
    deleteMessage,
    replyToMessage,
    showMessageMenu,
    uploadImage,
    startVoiceRecording,
    stopVoiceRecording,
    sendPrescriptionAsCard,
    confirmPrescriptionFromChat,
    playVoiceMessage,
    openPrescriptionInput,
    closePrescriptionInput,
    refreshPrescriptions,
    quickReply,
    showDoctorProfile,
    initChatSystem,
    startChatPolling,
    stopChatPolling,
    checkNewMessages,
    updateUnreadBadges,
    playMessageSound,
    loadPrescriptionsFromDoctor,
    sendFileMessage,
    sendDoctorFileMessage,
    setupWebSocket,
    setupTypingIndicator,
    showTypingIndicator,
    hideTypingIndicator,
    showDoctorTypingIndicator,
    hideDoctorTypingIndicator,
    wsRecallMessage,
    wsRecallDoctorMessage,
    addNote,
    handleImageUpload
} from './chat.js';

window.initTheme = initTheme;
window.initAccessibility = initAccessibility;
window.initKeyboardNavigation = initKeyboardNavigation;
window.toggleTheme = toggleTheme;
window.initI18n = initI18n;
window.checkLoginStatus = checkLoginStatus;
window.setupActivityTracking = setupActivityTracking;
window.login = login;
window.register = register;
window.logout = logout;
window.toggleForm = toggleForm;
window.resetPassword = resetPassword;
window.changePassword = changePassword;
window.toggleDropdown = toggleDropdown;
window.startSessionTimeout = startSessionTimeout;
window.updateActivity = updateActivity;
window.showNotification = showNotification;
window.toggleNotifications = toggleNotifications;
window.loadNotifications = loadNotifications;
window.addNotification = addNotification;
window.clearAllNotifications = clearAllNotifications;
window.updateNotificationBadge = updateNotificationBadge;
window.checkForNewNotifications = checkForNewNotifications;
window.startNotificationCheck = startNotificationCheck;
window.showTab = showTab;
window.switchDataSubTab = switchDataSubTab;
window.FeedbackSystem = FeedbackSystem;
window.showDoctorDashboard = showDoctorDashboard;
window.updateComparisonView = updateComparisonView;
window.setComparisonTimeRange = setComparisonTimeRange;
window.drawTrendChart = drawTrendChart;
window.drawDimensionTrendChart = drawDimensionTrendChart;
window.drawCorrelationHeatmap = drawCorrelationHeatmap;
window.calcPearsonCorrelation = calcPearsonCorrelation;
window.computeLinearRegression = computeLinearRegression;
window.exportToPDF = exportToPDF;
window.generateReport = generateReport;
window.generateConcentrationReport = generateConcentrationReport;
window.generateWeeklyHealthPlan = generateWeeklyHealthPlan;
window.generate4WeekExercisePlan = generate4WeekExercisePlan;
window.saveToHistory = saveToHistory;
window.initWizard = initWizard;
window.wizardNext = wizardNext;
window.wizardPrev = wizardPrev;
window.wizardSkip = wizardSkip;
window.setWizardDate = setWizardDate;
window.loadSampleData = loadSampleData;
window.clearData = clearData;
window.wizardSubmit = wizardSubmit;
window.autoSaveDraft = autoSaveDraft;
window.exportHealthReport = exportHealthReport;
window.exportElementToPDF = pdfExportElementToPDF;
window.exportHTMLToPDF = pdfExportHTMLToPDF;
window.saveReportAsPDF = pdfSaveReportAsPDF;
window.exportReportAsWord = pdfExportReportAsWord;
window.exportReportAsExcel = pdfExportReportAsExcel;
window.exportReportPDF = pdfExportReportPDF;
window.showExportMenu = pdfShowExportMenu;
window.closeExportMenu = pdfCloseExportMenu;
window.generateShareLink = pdfGenerateShareLink;
window.generateShareId = pdfGenerateShareId;
window.generateSharePassword = pdfGenerateSharePassword;
window.scrollToSection = pdfScrollToSection;
window.exportComparisonReport = pdfExportComparisonReport;
window.observeChart = observeChart;
window.disconnectAllChartObservers = disconnectAllChartObservers;
window.VirtualList = VirtualList;
window.limitHistoricalData = limitHistoricalData;
window.hasMoreData = hasMoreData;
window.debounce = debounce;
window.renderWithObserver = renderWithObserver;
window.createPatientVirtualList = createPatientVirtualList;
window.showHistoryLimitBadge = showHistoryLimitBadge;
window.trapFocus = trapFocus;
window.announce = announce;
window.announceLoading = announceLoading;
window.announceError = announceError;
window.announceSuccess = announceSuccess;
window.addSkipToContentLink = addSkipToContentLink;
window.initFocusRingManagement = initFocusRingManagement;
window.initRovingTabindex = initRovingTabindex;
window.injectARIALandmarks = injectARIALandmarks;
window.injectAriaExpandedOnToggles = injectAriaExpandedOnToggles;
window.associateFormErrors = associateFormErrors;
window.setElementLoading = setElementLoading;
window.ensureAriaLabels = ensureAriaLabels;
window.runA11yAudit = runA11yAudit;
window.getLatestAuditResult = getLatestAuditResult;
window.generateA11ySummaryHTML = generateA11ySummaryHTML;
window.PatientGroupManager = PatientGroupManager;
window.BatchOperations = BatchOperations;
window.MultiPatientComparison = MultiPatientComparison;
window.loadPatientPrescriptions = loadPatientPrescriptions;
window.loadChatMessages = loadChatMessages;
window.loadChatMessagesWithDoctor = loadChatMessagesWithDoctor;
window.loadDoctorList = loadDoctorList;
window.loadReportAccessStatus = loadReportAccessStatus;
window.selectDoctor = selectDoctor;
window.updateReportAccessUI = updateReportAccessUI;
window.sendMessage = sendMessage;
window.sendDoctorMessage = sendDoctorMessage;
window.deleteMessage = deleteMessage;
window.replyToMessage = replyToMessage;
window.showMessageMenu = showMessageMenu;
window.uploadImage = uploadImage;
window.startVoiceRecording = startVoiceRecording;
window.stopVoiceRecording = stopVoiceRecording;
window.sendPrescriptionAsCard = sendPrescriptionAsCard;
window.confirmPrescriptionFromChat = confirmPrescriptionFromChat;
window.playVoiceMessage = playVoiceMessage;
window.openPrescriptionInput = openPrescriptionInput;
window.closePrescriptionInput = closePrescriptionInput;
window.refreshPrescriptions = refreshPrescriptions;
window.quickReply = quickReply;
window.showDoctorProfile = showDoctorProfile;
window.initChatSystem = initChatSystem;
window.startChatPolling = startChatPolling;
window.stopChatPolling = stopChatPolling;
window.checkNewMessages = checkNewMessages;
window.updateUnreadBadges = updateUnreadBadges;
window.playMessageSound = playMessageSound;
window.loadPrescriptionsFromDoctor = loadPrescriptionsFromDoctor;
window.sendFileMessage = sendFileMessage;
window.sendDoctorFileMessage = sendDoctorFileMessage;
window.setupWebSocket = setupWebSocket;
window.setupTypingIndicator = setupTypingIndicator;
window.showTypingIndicator = showTypingIndicator;
window.hideTypingIndicator = hideTypingIndicator;
window.showDoctorTypingIndicator = showDoctorTypingIndicator;
window.hideDoctorTypingIndicator = hideDoctorTypingIndicator;
window.wsRecallMessage = wsRecallMessage;
window.wsRecallDoctorMessage = wsRecallDoctorMessage;
window.initInterventionStore = initInterventionStore;
window.getAllInterventions = getAllInterventions;
window.addIntervention = addIntervention;
window.updateIntervention = updateIntervention;
window.deleteIntervention = deleteIntervention;
window.publishIntervention = publishIntervention;
window.reviewIntervention = reviewIntervention;
window.queryInterventions = queryInterventions;
window.getCategoryStats = getCategoryStats;
window.getVersionHistoryForId = getVersionHistoryForId;
window.resetToDefaults = resetToDefaults;
window.generateDynamicRecommendations = generateDynamicRecommendations;
window.getCombinedRecommendations = getCombinedRecommendations;
window.getReviewQueue = getReviewQueue;
window.approveRecommendations = approveRecommendations;
window.rejectRecommendations = rejectRecommendations;
window.modifyRecommendation = modifyRecommendation;
window.getPendingReviewCount = getPendingReviewCount;
window.getRecommendationStats = getRecommendationStats;
window.getAuditTrailForPatient = getAuditTrailForPatient;
window.renderInterventionEditor = renderInterventionEditor;
window.saveUserProfile = saveUserProfile;
window.togglePasswordVisibility = togglePasswordVisibility;
window.toggleGlobalSearch = toggleGlobalSearch;
window.closeGlobalSearch = closeGlobalSearch;
window.performGlobalSearch = performGlobalSearch;
window.closeConfirmation = closeConfirmation;
window.toggleSoundFeedback = toggleSoundFeedback;
window.openFeedbackModal = openFeedbackModal;
window.closeFeedbackModal = closeFeedbackModal;
window.captureFeedbackScreenshot = captureFeedbackScreenshot;
window.submitFeedback = submitFeedback;
window.selectRating = selectRating;
window.skipRating = skipRating;
window.submitRating = submitRating;
window.closeMetabolicPreview = closeMetabolicPreview;
window.confirmMetabolicSave = confirmMetabolicSave;
window.filterMetabolicHistory = filterMetabolicHistory;
window.exportMetabolicCSV = exportMetabolicCSV;
window.refreshSuggestions = refreshSuggestions;
window.openQuickRecord = openQuickRecord;
window.closeQuickRecord = closeQuickRecord;
window.saveQuickRecord = saveQuickRecord;
window.updateTrendChart = updateTrendChart;
window.addNote = addNote;
window.handleImageUpload = handleImageUpload;
window.quickAddFood = quickAddFood;
window.searchFoodDatabase = searchFoodDatabase;
window.filterFoodCategory = filterFoodCategory;
window.saveWeightGoal = saveWeightGoal;
window.showPlaceholderAvatar = showPlaceholderAvatar;
window.triggerAvatarInteraction = triggerAvatarInteraction;
window.setMood = setMood;
window.openHeightWeightInput = openHeightWeightInput;
window.closeHeightWeightModal = closeHeightWeightModal;
window.saveHeightWeight = saveHeightWeight;
window.openGoalsModal = openGoalsModal;
window.closeGoalsModal = closeGoalsModal;
window.saveGoals = saveGoals;
window.analyzeMetabolicData = aiAnalyze;
window.enableAIDiagnosis = enableAIDiagnosis;
window.disableAIDiagnosis = disableAIDiagnosis;
window.isAIEnabled = isAIEnabled;
window.getAIMetrics = getAIMetrics;
window.startOnboarding = startOnboarding;
window.checkFirstVisit = checkFirstVisit;

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initAccessibility();
    initKeyboardNavigation();
    initI18n();
    initAccessibilityEnhancements();
    FeedbackSystem.init();
    checkLoginStatus();
    setupActivityTracking();
    startSessionTimeout();
    startNotificationCheck();
    updateNotificationBadge();
    initParticleBackground();
    initScrollReveal();
    checkFirstVisit();
});