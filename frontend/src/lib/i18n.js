/**
 * PiVault Internationalization Module
 * Supports English (en) and Italian (it)
 */

const translations = {
  en: {
    // App
    app_name: 'PiVault',
    app_tagline: 'Self-Hosted Password Manager',
    
    // Auth
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    master_password: 'Master Password',
    confirm_password: 'Confirm Password',
    forgot_password: 'Forgot Password?',
    no_account: "Don't have an account?",
    have_account: 'Already have an account?',
    create_account: 'Create Account',
    signing_in: 'Signing in...',
    creating_account: 'Creating account...',
    
    // TOTP
    totp_code: '2FA Code',
    totp_required: '2FA code required',
    enable_2fa: 'Enable 2FA',
    disable_2fa: 'Disable 2FA',
    scan_qr: 'Scan QR code with your authenticator app',
    enter_code: 'Enter the 6-digit code',
    verify: 'Verify',
    totp_enabled: '2FA enabled successfully',
    totp_disabled: '2FA disabled',
    backup_codes: 'Save your backup codes',
    
    // Vault
    vault: 'Vault',
    all_items: 'All Items',
    favorites: 'Favorites',
    add_item: 'Add Item',
    edit_item: 'Edit Item',
    delete_item: 'Delete Item',
    search_vault: 'Search vault...',
    no_items: 'No items in your vault',
    no_items_desc: 'Add your first password to get started',
    decrypting: 'Decrypting vault...',
    
    // Entry fields
    title: 'Title',
    username: 'Username',
    website: 'Website',
    url: 'URL',
    notes: 'Notes',
    category: 'Category',
    created: 'Created',
    updated: 'Last Updated',
    
    // Actions
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    copy: 'Copy',
    copied: 'Copied!',
    show: 'Show',
    hide: 'Hide',
    generate: 'Generate',
    refresh: 'Refresh',
    
    // Password Generator
    password_generator: 'Password Generator',
    length: 'Length',
    uppercase: 'Uppercase (A-Z)',
    lowercase: 'Lowercase (a-z)',
    numbers: 'Numbers (0-9)',
    symbols: 'Symbols (!@#$%)',
    exclude_ambiguous: 'Exclude ambiguous (0, O, l, 1)',
    generate_password: 'Generate Password',
    use_password: 'Use Password',
    
    // Password Strength
    password_strength: 'Password Strength',
    strength_weak: 'Weak',
    strength_fair: 'Fair',
    strength_good: 'Good',
    strength_strong: 'Strong',
    password_too_short: 'At least 8 characters',
    add_uppercase: 'Add uppercase letters',
    add_lowercase: 'Add lowercase letters',
    add_numbers: 'Add numbers',
    add_special: 'Add special characters',
    avoid_common_patterns: 'Avoid common patterns',
    
    // Categories
    categories: 'Categories',
    add_category: 'Add Category',
    edit_category: 'Edit Category',
    delete_category: 'Delete Category',
    category_name: 'Category Name',
    category_icon: 'Icon',
    general: 'General',
    social: 'Social',
    work: 'Work',
    finance: 'Finance',
    shopping: 'Shopping',
    
    // Settings
    settings: 'Settings',
    language: 'Language',
    auto_lock: 'Auto-lock',
    auto_lock_desc: 'Lock vault after inactivity',
    minutes: 'minutes',
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light',
    export_vault: 'Export Vault',
    import_vault: 'Import Vault',
    export_desc: 'Download encrypted backup',
    import_desc: 'Restore from backup file',
    security: 'Security',
    account: 'Account',
    
    // Export/Import
    export: 'Export',
    import: 'Import',
    exporting: 'Exporting...',
    importing: 'Importing...',
    export_success: 'Vault exported successfully',
    import_success: 'Vault imported successfully',
    import_entries: 'entries imported',
    select_file: 'Select file',
    
    // Errors
    error: 'Error',
    error_generic: 'Something went wrong',
    invalid_credentials: 'Invalid email or password',
    email_exists: 'Email already registered',
    too_many_attempts: 'Too many attempts. Try again later.',
    invalid_totp: 'Invalid 2FA code',
    session_expired: 'Session expired. Please login again.',
    network_error: 'Network error. Check your connection.',
    
    // Success
    success: 'Success',
    item_saved: 'Item saved',
    item_deleted: 'Item deleted',
    category_saved: 'Category saved',
    category_deleted: 'Category deleted',
    settings_saved: 'Settings saved',
    
    // Confirmations
    confirm_delete: 'Are you sure?',
    confirm_delete_item: 'This will permanently delete this item.',
    confirm_delete_category: 'This will delete the category. Items will be moved to General.',
    confirm_logout: 'Are you sure you want to logout?',
    
    // Lock screen
    vault_locked: 'Vault Locked',
    unlock: 'Unlock',
    enter_master_password: 'Enter your master password',
    
    // Footer
    self_hosted: 'Self-hosted',
    encrypted: 'End-to-end encrypted',
    zero_knowledge: 'Zero-knowledge',
    
    // Misc
    loading: 'Loading...',
    empty: 'Empty',
    optional: 'optional',
    required: 'required',
  },
  
  it: {
    // App
    app_name: 'PiVault',
    app_tagline: 'Password Manager Self-Hosted',
    
    // Auth
    login: 'Accedi',
    register: 'Registrati',
    logout: 'Esci',
    email: 'Email',
    password: 'Password',
    master_password: 'Master Password',
    confirm_password: 'Conferma Password',
    forgot_password: 'Password dimenticata?',
    no_account: 'Non hai un account?',
    have_account: 'Hai già un account?',
    create_account: 'Crea Account',
    signing_in: 'Accesso in corso...',
    creating_account: 'Creazione account...',
    
    // TOTP
    totp_code: 'Codice 2FA',
    totp_required: 'Codice 2FA richiesto',
    enable_2fa: 'Attiva 2FA',
    disable_2fa: 'Disattiva 2FA',
    scan_qr: "Scansiona il QR code con l'app di autenticazione",
    enter_code: 'Inserisci il codice a 6 cifre',
    verify: 'Verifica',
    totp_enabled: '2FA attivato con successo',
    totp_disabled: '2FA disattivato',
    backup_codes: 'Salva i tuoi codici di backup',
    
    // Vault
    vault: 'Vault',
    all_items: 'Tutti gli elementi',
    favorites: 'Preferiti',
    add_item: 'Aggiungi',
    edit_item: 'Modifica',
    delete_item: 'Elimina',
    search_vault: 'Cerca nel vault...',
    no_items: 'Nessun elemento nel vault',
    no_items_desc: 'Aggiungi la tua prima password per iniziare',
    decrypting: 'Decifratura in corso...',
    
    // Entry fields
    title: 'Titolo',
    username: 'Nome utente',
    website: 'Sito web',
    url: 'URL',
    notes: 'Note',
    category: 'Categoria',
    created: 'Creato',
    updated: 'Ultimo aggiornamento',
    
    // Actions
    save: 'Salva',
    cancel: 'Annulla',
    delete: 'Elimina',
    edit: 'Modifica',
    copy: 'Copia',
    copied: 'Copiato!',
    show: 'Mostra',
    hide: 'Nascondi',
    generate: 'Genera',
    refresh: 'Aggiorna',
    
    // Password Generator
    password_generator: 'Generatore Password',
    length: 'Lunghezza',
    uppercase: 'Maiuscole (A-Z)',
    lowercase: 'Minuscole (a-z)',
    numbers: 'Numeri (0-9)',
    symbols: 'Simboli (!@#$%)',
    exclude_ambiguous: 'Escludi ambigui (0, O, l, 1)',
    generate_password: 'Genera Password',
    use_password: 'Usa Password',
    
    // Password Strength
    password_strength: 'Sicurezza Password',
    strength_weak: 'Debole',
    strength_fair: 'Discreta',
    strength_good: 'Buona',
    strength_strong: 'Forte',
    password_too_short: 'Almeno 8 caratteri',
    add_uppercase: 'Aggiungi maiuscole',
    add_lowercase: 'Aggiungi minuscole',
    add_numbers: 'Aggiungi numeri',
    add_special: 'Aggiungi caratteri speciali',
    avoid_common_patterns: 'Evita pattern comuni',
    
    // Categories
    categories: 'Categorie',
    add_category: 'Aggiungi Categoria',
    edit_category: 'Modifica Categoria',
    delete_category: 'Elimina Categoria',
    category_name: 'Nome Categoria',
    category_icon: 'Icona',
    general: 'Generale',
    social: 'Social',
    work: 'Lavoro',
    finance: 'Finanza',
    shopping: 'Shopping',
    
    // Settings
    settings: 'Impostazioni',
    language: 'Lingua',
    auto_lock: 'Blocco automatico',
    auto_lock_desc: 'Blocca il vault dopo inattività',
    minutes: 'minuti',
    theme: 'Tema',
    dark: 'Scuro',
    light: 'Chiaro',
    export_vault: 'Esporta Vault',
    import_vault: 'Importa Vault',
    export_desc: 'Scarica backup cifrato',
    import_desc: 'Ripristina da file di backup',
    security: 'Sicurezza',
    account: 'Account',
    
    // Export/Import
    export: 'Esporta',
    import: 'Importa',
    exporting: 'Esportazione...',
    importing: 'Importazione...',
    export_success: 'Vault esportato con successo',
    import_success: 'Vault importato con successo',
    import_entries: 'elementi importati',
    select_file: 'Seleziona file',
    
    // Errors
    error: 'Errore',
    error_generic: 'Qualcosa è andato storto',
    invalid_credentials: 'Email o password non validi',
    email_exists: 'Email già registrata',
    too_many_attempts: 'Troppi tentativi. Riprova più tardi.',
    invalid_totp: 'Codice 2FA non valido',
    session_expired: 'Sessione scaduta. Accedi di nuovo.',
    network_error: 'Errore di rete. Controlla la connessione.',
    
    // Success
    success: 'Successo',
    item_saved: 'Elemento salvato',
    item_deleted: 'Elemento eliminato',
    category_saved: 'Categoria salvata',
    category_deleted: 'Categoria eliminata',
    settings_saved: 'Impostazioni salvate',
    
    // Confirmations
    confirm_delete: 'Sei sicuro?',
    confirm_delete_item: 'Questo elemento verrà eliminato permanentemente.',
    confirm_delete_category: 'La categoria verrà eliminata. Gli elementi verranno spostati in Generale.',
    confirm_logout: 'Sei sicuro di voler uscire?',
    
    // Lock screen
    vault_locked: 'Vault Bloccato',
    unlock: 'Sblocca',
    enter_master_password: 'Inserisci la tua master password',
    
    // Footer
    self_hosted: 'Self-hosted',
    encrypted: 'Crittografia end-to-end',
    zero_knowledge: 'Zero-knowledge',
    
    // Misc
    loading: 'Caricamento...',
    empty: 'Vuoto',
    optional: 'opzionale',
    required: 'obbligatorio',
  }
};

// Get browser language
const getBrowserLanguage = () => {
  const lang = navigator.language.split('-')[0];
  return translations[lang] ? lang : 'en';
};

// Translation function
export const t = (key, lang = 'en') => {
  return translations[lang]?.[key] || translations['en']?.[key] || key;
};

// Get all translations for a language
export const getTranslations = (lang = 'en') => {
  return translations[lang] || translations['en'];
};

// Available languages
export const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' }
];

export { getBrowserLanguage };
export default translations;
