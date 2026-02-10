import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Plus, Search, Lock, Folder, LogOut, Settings,
  Key, Globe, User, Copy, Eye, EyeOff, Trash2, Edit,
  MoreVertical, Menu, X, RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { useAuth } from '../context/AuthContext';
import { vaultAPI, categoriesAPI } from '../lib/api';
import { encryptData, decryptData, copyToClipboard } from '../lib/crypto';
import { t } from '../lib/i18n';
import { toast } from 'sonner';
import VaultEntryModal from '../components/VaultEntryModal';
import PasswordGeneratorModal from '../components/PasswordGeneratorModal';
import CategoryModal from '../components/CategoryModal';

import logo from '../assets/logo.jpg';

const categoryIcons = {
  folder: Folder,
  key: Key,
  globe: Globe,
  user: User,
  lock: Lock,
};

const VaultPage = () => {
  const navigate = useNavigate();
  const { user, encryptionKey, logout, lockVault, language, updateActivity } = useAuth();

  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [decryptedEntries, setDecryptedEntries] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Modals
  const [entryModal, setEntryModal] = useState({ open: false, entry: null });
  const [generatorModal, setGeneratorModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState({ open: false, category: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, entryId: null });

  // Visibility states
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [entriesRes, categoriesRes] = await Promise.all([
        vaultAPI.getEntries(selectedCategory),
        categoriesAPI.getAll()
      ]);
      setEntries(entriesRes.data);
      setCategories(categoriesRes.data);
    } catch (err) {
      toast.error(t('error_generic', language));
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, language]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Decrypt entries when data or key changes
  useEffect(() => {
    if (!encryptionKey || entries.length === 0) {
      setDecryptedEntries([]);
      return;
    }

    setIsDecrypting(true);

    // Simulate brief decryption animation
    setTimeout(() => {
      const decrypted = entries.map(entry => {
        const data = decryptData(entry.encrypted_data, entry.nonce, encryptionKey);
        return {
          id: entry.id,
          category_id: entry.category_id,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          ...data
        };
      }).filter(e => e.title); // Filter out failed decryptions

      setDecryptedEntries(decrypted);
      setIsDecrypting(false);
    }, 500);
  }, [entries, encryptionKey]);

  // Filter entries by search
  const filteredEntries = decryptedEntries.filter(entry => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.title?.toLowerCase().includes(query) ||
      entry.username?.toLowerCase().includes(query) ||
      entry.url?.toLowerCase().includes(query)
    );
  });

  // Handle copy
  const handleCopy = async (text, type) => {
    updateActivity();
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(`${type} ${t('copied', language)}`, { duration: 2000 });
    }
  };

  // Toggle password visibility
  const togglePassword = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Handle save entry
  const handleSaveEntry = async (entryData, entryId = null) => {
    try {
      const { encrypted, nonce } = encryptData(entryData, encryptionKey);

      if (entryId) {
        await vaultAPI.updateEntry(entryId, encrypted, nonce, entryData.category_id);
        toast.success(t('item_saved', language));
      } else {
        await vaultAPI.createEntry(encrypted, nonce, entryData.category_id);
        toast.success(t('item_saved', language));
      }

      setEntryModal({ open: false, entry: null });
      fetchData();
    } catch (err) {
      toast.error(t('error_generic', language));
    }
  };

  // Handle delete entry
  const handleDeleteEntry = async () => {
    if (!deleteDialog.entryId) return;

    try {
      await vaultAPI.deleteEntry(deleteDialog.entryId);
      toast.success(t('item_deleted', language));
      setDeleteDialog({ open: false, entryId: null });
      fetchData();
    } catch (err) {
      toast.error(t('error_generic', language));
    }
  };

  // Handle category save
  const handleSaveCategory = async (categoryData, categoryId = null) => {
    try {
      if (categoryId) {
        await categoriesAPI.update(categoryId, categoryData.name, categoryData.icon);
      } else {
        await categoriesAPI.create(categoryData.name, categoryData.icon);
      }
      toast.success(t('category_saved', language));
      setCategoryModal({ open: false, category: null });
      fetchData();
    } catch (err) {
      toast.error(t('error_generic', language));
    }
  };

  // Handle category delete
  const handleDeleteCategory = async (categoryId) => {
    try {
      await categoriesAPI.delete(categoryId);
      toast.success(t('category_deleted', language));
      if (selectedCategory === categoryId) {
        setSelectedCategory(null);
      }
      fetchData();
    } catch (err) {
      toast.error(t('error_generic', language));
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Get category name
  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || t('general', language);
  };

  return (
    <div className="min-h-screen bg-background flex" data-testid="vault-page">
      {/* Sidebar - Desktop */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-72 bg-[#000] border-r border-border/40
        transform transition-transform duration-200 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                  <img src={logo} alt="Logo" className="w-7 h-7 rounded object-cover" />
                </div>
                <div>
                  <span className="font-bold tracking-tight text-xl block">PiVault</span>
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider">By Chrxstxqn</span>
                </div>
              </div>
              <button
                className="md:hidden text-muted-foreground"
                onClick={() => setShowSidebar(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Categories */}
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1">
              {/* All items */}
              <button
                data-testid="category-all"
                onClick={() => setSelectedCategory(null)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm sidebar-item
                  ${selectedCategory === null ? 'active' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}
                `}
              >
                <Key className="w-4 h-4" />
                {t('all_items', language)}
                <span className="ml-auto text-xs text-muted-foreground">
                  {decryptedEntries.length}
                </span>
              </button>

              {/* Category list */}
              {categories.map(category => {
                const IconComponent = categoryIcons[category.icon] || Folder;
                const count = decryptedEntries.filter(e => e.category_id === category.id).length;

                return (
                  <div key={category.id} className="group relative">
                    <button
                      data-testid={`category-${category.id}`}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm sidebar-item
                        ${selectedCategory === category.id ? 'active' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}
                      `}
                    >
                      <IconComponent className="w-4 h-4" />
                      {category.name}
                      <span className="ml-auto text-xs text-muted-foreground">{count}</span>
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity">
                          <MoreVertical className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setCategoryModal({ open: true, category })}>
                          <Edit className="w-4 h-4 mr-2" />
                          {t('edit', language)}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('delete', language)}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>

            {/* Add category button */}
            <button
              data-testid="add-category-btn"
              onClick={() => setCategoryModal({ open: true, category: null })}
              className="w-full flex items-center gap-3 px-3 py-2 mt-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('add_category', language)}
            </button>
          </ScrollArea>

          {/* User section */}
          <div className="p-2 border-t border-border/40">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="truncate flex-1 text-left">{user?.email}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  {t('settings', language)}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={lockVault}>
                  <Lock className="w-4 h-4 mr-2" />
                  {t('vault_locked', language)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('logout', language)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-10 glass border-b border-border/40 px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-muted-foreground"
              onClick={() => setShowSidebar(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                data-testid="vault-search-input"
                placeholder={t('search_vault', language)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-input border-transparent focus:border-primary max-w-md"
              />
            </div>

            <Button
              data-testid="generate-password-btn"
              variant="outline"
              size="sm"
              onClick={() => setGeneratorModal(true)}
              className="hidden sm:flex"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('generate', language)}
            </Button>

            <Button
              data-testid="add-entry-btn"
              size="sm"
              onClick={() => setEntryModal({ open: true, entry: null })}
              className="btn-glow"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('add_item', language)}
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {isLoading || isDecrypting ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">
                {isDecrypting ? t('decrypting', language) : t('loading', language)}
              </p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                <Key className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">{t('no_items', language)}</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {t('no_items_desc', language)}
                </p>
              </div>
              <Button onClick={() => setEntryModal({ open: true, entry: null })}>
                <Plus className="w-4 h-4 mr-2" />
                {t('add_item', language)}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  data-testid={`vault-entry-${entry.id}`}
                  className="vault-item group flex items-center gap-4 p-4 bg-card border border-transparent hover:border-border rounded-lg cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setEntryModal({ open: true, entry })}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{entry.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {entry.username || entry.url || getCategoryName(entry.category_id)}
                    </p>
                  </div>

                  {/* Password preview */}
                  <div className="hidden md:flex items-center gap-2">
                    <span className="text-sm text-muted-foreground font-mono password-mask">
                      {visiblePasswords[entry.id] ? entry.password : '••••••••••••'}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePassword(entry.id); }}
                      className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {visiblePasswords[entry.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      data-testid={`copy-username-${entry.id}`}
                      onClick={(e) => { e.stopPropagation(); handleCopy(entry.username, 'Username'); }}
                      className="p-2 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy username"
                    >
                      <User className="w-4 h-4" />
                    </button>
                    <button
                      data-testid={`copy-password-${entry.id}`}
                      onClick={(e) => { e.stopPropagation(); handleCopy(entry.password, 'Password'); }}
                      className="p-2 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy password"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      data-testid={`delete-entry-${entry.id}`}
                      onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, entryId: entry.id }); }}
                      className="p-2 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <VaultEntryModal
        open={entryModal.open}
        entry={entryModal.entry}
        categories={categories}
        language={language}
        onClose={() => setEntryModal({ open: false, entry: null })}
        onSave={handleSaveEntry}
        onOpenGenerator={() => setGeneratorModal(true)}
      />

      <PasswordGeneratorModal
        open={generatorModal}
        language={language}
        onClose={() => setGeneratorModal(false)}
      />

      <CategoryModal
        open={categoryModal.open}
        category={categoryModal.category}
        language={language}
        onClose={() => setCategoryModal({ open: false, category: null })}
        onSave={handleSaveCategory}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, entryId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_delete', language)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirm_delete_item', language)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel', language)}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntry}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete', language)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VaultPage;
