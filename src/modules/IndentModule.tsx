<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import bus from '../utils/eventBus';
import * as XLSX from 'xlsx';
import { subscribeFirestoreDocs, replaceFirestoreCollection, getFirestoreDocs } from '../utils/firestoreSync';
=======
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import bus from '../utils/eventBus';
import { subscribeFirestoreDocs, replaceFirestoreCollection } from '../utils/firestoreSync';
>>>>>>> ea2b60370e32f18454b4b30c524aa7881340b2ee
import { getItemMaster, subscribeStockRecords, subscribePurchaseOrders } from '../utils/firestoreServices';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

<<<<<<< HEAD
=======
// ─── Types ────────────────────────────────────────────────────────────────────
>>>>>>> ea2b60370e32f18454b4b30c524aa7881340b2ee
interface IndentItem {
  model: string;
  itemCode: string;
  qty: number;
  indentClosed: boolean;
}
<<<<<<< HEAD

=======
>>>>>>> ea2b60370e32f18454b4b30c524aa7881340b2ee
interface Indent {
  indentNo: string;
  date: string;
  indentBy: string;
  oaNo: string;
  items: IndentItem[];
}
<<<<<<< HEAD

interface IndentModuleProps {
  user?: any;
}

const IndentModule: React.FC<IndentModuleProps> = ({ user }) => {
  // Get uid from user prop or use a default
  const [uid] = useState<string>(user?.uid || 'default-user');

  const [indents, setIndents] = useState<Indent[]>([]);

=======
interface IndentModuleProps { user?: any; }

// ─── Design System ────────────────────────────────────────────────────────────
const S = {
  bg: '#F7F8FC',
  surface: '#FFFFFF',
  border: '#E4E8F0',
  borderStrong: '#CBD2E0',
  accent: '#3B5BDB',
  accentLight: '#EEF2FF',
  accentHover: '#2F4AC0',
  success: '#2F9E44',
  successLight: '#EBFBEE',
  danger: '#C92A2A',
  dangerLight: '#FFF5F5',
  warning: '#E67700',
  warningLight: '#FFF9DB',
  textPrimary: '#1A1F36',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  numericRight: 'right' as const,

  card: {
    background: '#FFFFFF',
    border: '1px solid #E4E8F0',
    borderRadius: 12,
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  } as React.CSSProperties,

  input: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #CBD2E0',
    fontSize: 14,
    color: '#1A1F36',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
    lineHeight: '1.5',
  } as React.CSSProperties,

  inputDisabled: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #E4E8F0',
    fontSize: 14,
    color: '#6B7280',
    background: '#F7F8FC',
    cursor: 'not-allowed',
  } as React.CSSProperties,

  btnPrimary: {
    background: '#3B5BDB',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'background 0.15s, transform 0.1s',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  btnSuccess: {
    background: '#2F9E44',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'background 0.15s',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  btnDanger: {
    background: 'transparent',
    color: '#C92A2A',
    border: '1px solid #FECACA',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  btnGhost: {
    background: 'transparent',
    color: '#6B7280',
    border: '1px solid #E4E8F0',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'background 0.15s, border-color 0.15s',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  btnEdit: {
    background: '#EEF2FF',
    color: '#3B5BDB',
    border: '1px solid #C5D0FA',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 4,
    display: 'block',
  },

  th: {
    padding: '10px 12px',
    textAlign: 'left' as const,
    fontSize: 11,
    fontWeight: 700,
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    background: '#F7F8FC',
    borderBottom: '2px solid #E4E8F0',
    whiteSpace: 'nowrap' as const,
  },

  thRight: {
    padding: '10px 12px',
    textAlign: 'right' as const,
    fontSize: 11,
    fontWeight: 700,
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    background: '#F7F8FC',
    borderBottom: '2px solid #E4E8F0',
    whiteSpace: 'nowrap' as const,
  },

  td: {
    padding: '10px 12px',
    fontSize: 14,
    color: '#1A1F36',
    borderBottom: '1px solid #F1F3F9',
    whiteSpace: 'nowrap' as const,
  },

  tdClip: {
    padding: '10px 12px',
    fontSize: 14,
    color: '#1A1F36',
    borderBottom: '1px solid #F1F3F9',
    maxWidth: 200,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  },

  tdRight: {
    padding: '10px 12px',
    fontSize: 14,
    color: '#1A1F36',
    borderBottom: '1px solid #F1F3F9',
    textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const,
    fontVariantNumeric: 'tabular-nums',
  } as React.CSSProperties,
};

// ─── Toast ────────────────────────────────────────────────────────────────────
interface Toast { id: number; msg: string; type: 'success' | 'error' | 'info'; }
let toastCounter = 0;

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 18px', borderRadius: 10, fontSize: 14, fontWeight: 500, color: '#fff',
          background: t.type === 'success' ? '#2F9E44' : t.type === 'error' ? '#C92A2A' : '#3B5BDB',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', animation: 'slideUp 0.2s ease',
          maxWidth: 340, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'} {t.msg}
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <span style={S.label}>{label}</span>
      {children}
    </div>
  );
}

function StatusBadge({ closed }: { closed: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 700, letterSpacing: '0.03em',
      background: closed ? S.successLight : S.dangerLight,
      color: closed ? S.success : S.danger,
      border: `1px solid ${closed ? '#A9E6B8' : '#FECACA'}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: closed ? S.success : S.danger }} />
      {closed ? 'CLOSED' : 'OPEN'}
    </span>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ ...S.card, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120, flex: 1 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: S.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 26, fontWeight: 800, color: color || S.textPrimary, lineHeight: 1.2 }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: S.textSecondary }}>{sub}</span>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const IndentModule: React.FC<IndentModuleProps> = ({ user }) => {
  const [uid] = useState<string>(user?.uid || 'default-user');

  const [indents, setIndents] = useState<Indent[]>([]);
>>>>>>> ea2b60370e32f18454b4b30c524aa7881340b2ee
  const [itemMaster, setItemMaster] = useState<{ itemName: string; itemCode: string }[]>([]);
  const [stockRecords, setStockRecords] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

<<<<<<< HEAD
  // Subscribe to Firestore collections and load itemMaster on mount
  useEffect(() => {
    let unsubIndents: any = () => {};
    let unsubStock: any = () => {};
    let unsubPO: any = () => {};

    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        // Load itemMaster using one-time fetch (same pattern as StockModule/VSIR)
        (async () => {
          try {
            const items = await getItemMaster(u.uid);
            console.log('[IndentModule] ✅ getItemMaster returned:', items?.length || 0, 'items');
            setItemMaster((items || []) as any[]);
          } catch (e) {
            console.error('[IndentModule] ❌ getItemMaster failed', e);
            setItemMaster([]);
          }
        })();

        // Subscribe to collections
        unsubIndents = subscribeFirestoreDocs(u.uid, 'indentData', (docs) => {
          const formattedIndents = docs.map(doc => ({
=======
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((msg: string, type: Toast['type'] = 'info') => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const [showFilters, setShowFilters] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const activeFilterCount = [filterText, filterStatus !== 'ALL', filterDateFrom, filterDateTo].filter(Boolean).length;

  const [newIndent, setNewIndent] = useState<Indent>({ indentNo: '', date: '', indentBy: '', oaNo: '', items: [] });
  const [itemInput, setItemInput] = useState<IndentItem>({ model: '', itemCode: '', qty: 0, indentClosed: false });
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const unsubRefs = useRef<Array<() => void>>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        getItemMaster(u.uid)
          .then(items => setItemMaster((items || []) as any[]))
          .catch(() => setItemMaster([]));

        const unsubIndents = subscribeFirestoreDocs(u.uid, 'indentData', (docs) => {
          setIndents(docs.map(doc => ({
>>>>>>> ea2b60370e32f18454b4b30c524aa7881340b2ee
            indentNo: doc.indentNo,
            date: doc.date,
            indentBy: doc.indentBy,
            oaNo: doc.oaNo,
            items: Array.isArray(doc.items) ? doc.items : [],
<<<<<<< HEAD
          }));
          setIndents(formattedIndents);
        });

        unsubStock = subscribeStockRecords(u.uid, (docs) => {
          console.log('[IndentModule] 📦 Stock records received:', docs?.length || 0, 'records');
          if (docs?.length > 0) {
            console.log('[IndentModule] Sample stock record:', docs[0]);
          }
          setStockRecords(docs || []);
        });

        unsubPO = subscribePurchaseOrders(u.uid, (docs) => {
          console.log('[IndentModule] 🛒 Purchase orders received:', docs?.length || 0, 'records');
          setPurchaseOrders(docs || []);
        });
      } else {
        setItemMaster([]);
        setIndents([]);
        setStockRecords([]);
        setPurchaseOrders([]);
=======
          })));
        });

        const unsubStock = subscribeStockRecords(u.uid, (docs) => setStockRecords(docs || []));
        const unsubPO = subscribePurchaseOrders(u.uid, (docs) => setPurchaseOrders(docs || []));

        unsubRefs.current = [unsubIndents, unsubStock, unsubPO];
      } else {
        setItemMaster([]); setIndents([]); setStockRecords([]); setPurchaseOrders([]);
>>>>>>> ea2b60370e32f18454b4b30c524aa7881340b2ee
      }
    });

    return () => {
      try { unsub(); } catch {}
<<<<<<< HEAD
      try { unsubIndents(); } catch {}
      try { unsubStock(); } catch {}
      try { unsubPO(); } catch {}
    };
  }, []);

  function getNextIndentNo() {
    const base = 'S-8/25-';
    if (indents.length === 0) return base + '01';
    const lastSerial = Math.max(
      ...indents.map(i => {
        const match = i.indentNo.match(/S-8\/25-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
    );
    const nextSerial = lastSerial + 1;
    return base + String(nextSerial).padStart(2, '0');
  }

  // Helper function to get next OA NO based on indent by and prefix
  function getNextOANo(indentByValue: string, currentOANo: string = ''): string {
    if (!indentByValue) return '';
    
    // If user just typed "Stock" without a number, auto-format it
    if (currentOANo.trim() === 'Stock') {
      // Find all OA NOs for the same indent by that contain "Stock"
      const relatedOANos = indents
        .filter(indent => indent.indentBy === indentByValue && indent.oaNo.includes('Stock'))
        .map(indent => indent.oaNo);
      
      // Extract numbers from OA NOs like "Stock 05", "Stock 1", etc.
      const numbers = relatedOANos
        .map(oaNo => {
          const match = oaNo.match(/Stock\s+(\d+)/i);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);

      // Start from 01 if no Stock entries found
      const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
      const nextNumber = maxNumber + 1;
      return 'Stock ' + String(nextNumber).padStart(2, '0');
    }
    
    // Find all OA NOs for the same indent by that contain "Stock"
    const relatedOANos = indents
      .filter(indent => indent.indentBy === indentByValue && indent.oaNo.includes('Stock'))
      .map(indent => indent.oaNo)
      .filter(oaNo => oaNo && oaNo.includes('Stock'));
    
    if (relatedOANos.length === 0) {
      // No existing "Stock" OA NOs for this indent by
      return '';
    }

    // Extract numbers from OA NOs like "Stock 05"
    const numbers = relatedOANos
      .map(oaNo => {
        const match = oaNo.match(/Stock\s+(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);

    if (numbers.length === 0) {
      return '';
    }

    const maxNumber = Math.max(...numbers);
    const nextNumber = maxNumber + 1;
    return 'Stock ' + String(nextNumber).padStart(2, '0');
  }

  const [newIndent, setNewIndent] = useState<Indent>({
    indentNo: getNextIndentNo(),
    date: '',
    indentBy: '',
    oaNo: '',
    items: [],
  });

  const [itemInput, setItemInput] = useState<IndentItem>({
    model: '',
    itemCode: '',
    qty: 0,
    indentClosed: false,
  });

  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [_itemNames, _setItemNames] = useState<string[]>([]);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugFilter, setDebugFilter] = useState('');


  // Helper to normalize item codes for matching
  const normalizeCode = (code: string): string => {
    return String(code || '').trim().toUpperCase();
  };

  // Helper to get stock for an item
  const getStock = (itemCode: string) => {
    if (!itemCode) {
      console.warn('[IndentModule] getStock called with empty itemCode');
      return 0;
    }
    
    const normalizedSearchCode = normalizeCode(itemCode);
    // Try multiple candidate fields and matching strategies (code exact, name exact, alpha match)
    const norm = (v: any) => (v === undefined || v === null) ? '' : String(v).trim().toUpperCase();
    const alpha = (v: any) => norm(v).replace(/[^A-Z0-9]/g, '');

    let matched: any = null;
    const codeNorm = norm(itemCode || '');
    const targetAlpha = alpha(itemCode || '');

    for (const s of stockRecords || []) {
      try {
        const candidates = [s.itemCode, s.ItemCode, s.code, s.Code, s.item_code, s.itemName, s.ItemName, s.name, s.Name, s.sku, s.SKU];
        // exact code match first
        if (codeNorm && candidates.some(c => norm(c) === codeNorm)) { matched = s; break; }
        // alpha/exact across fields
        if (candidates.some(c => alpha(c) === targetAlpha || norm(c) === codeNorm)) { matched = s; break; }
        // contains fallback
        if (Object.values(s).some((v: any) => { try { const a = alpha(v); const n = norm(v); return a.includes(targetAlpha) || targetAlpha.includes(a) || n.includes(codeNorm) || codeNorm.includes(n); } catch { return false; } })) { matched = s; break; }
      } catch (err) {
        continue;
      }
    }

    if (!matched) {
      console.debug('[IndentModule] Stock not found for itemCode:', itemCode, '(normalized:', normalizedSearchCode, ')', 'Available sample codes:', stockRecords.map((s: any) => s.itemCode || s.ItemCode || s.Item_name).slice(0,10));
      return 0;
    }

    const closingKeys = ['closingStock','closing_stock','ClosingStock','closing','closingQty','closing_qty','Closing','closing stock','Closing Stock','closingstock','closingStockQty','closing_stock_qty','ClosingStockQty','closingstockqty'];
    let closingStock: number | null = null;
    for (const k of closingKeys) {
      if (matched[k] != null && !isNaN(Number(matched[k]))) { closingStock = Number(matched[k]); break; }
    }
    if (closingStock === null) {
      // fallback to match Stock Module calculation: stockQty + purStoreOkQty + vendorOkQty - inHouseIssuedQty
      const stockQty = (matched.stockQty || matched.stock_qty || matched.stock || matched.StockQty || matched.currentStock) || 0;
      const purStoreOkQty = (matched.purStoreOkQty || matched.pur_store_ok_qty || matched.PurStoreOkQty) || 0;
      const vendorOkQty = (matched.vendorOkQty || matched.vendor_ok_qty || matched.VendorOkQty) || 0;
      const inHouseIssuedQty = (matched.inHouseIssuedQty || matched.in_house_issued_qty || matched.InHouseIssuedQty) || 0;
      closingStock = Number(stockQty) + Number(purStoreOkQty) + Number(vendorOkQty) - Number(inHouseIssuedQty) || 0;
    }

    console.debug('[IndentModule] Stock found for', itemCode, ':', closingStock, 'matchedBy:', matched);
    return closingStock;
  };

  // FIXED: Calculate cumulative allocated qty up to a specific indent (including partial allocations from OPEN indents)
  const getCumulativeAllocatedQtyUpTo = (itemCode: string, upToIndentIndex: number) => {
    let totalAllocated = 0;
    for (let i = 0; i < upToIndentIndex; i++) {
      const indent = indents[i];
      indent.items.forEach(item => {
        if (item.itemCode === itemCode) {
          const availableBefore = getStock(itemCode) - totalAllocated;
          const allocatedForThisIndent = Math.min(Math.max(0, availableBefore), Number(item.qty) || 0);
          totalAllocated += allocatedForThisIndent;
        }
      });
    }
    return totalAllocated;
  };

  // Get PO Quantity (Purchase Order Quantity) for an item
  const getPOQuantity = (itemCode: string) => {
    let totalPOQty = 0;
    purchaseOrders.forEach((po: any) => {
      if (po.items && Array.isArray(po.items)) {
        po.items.forEach((item: any) => {
          if (item.itemCode === itemCode) {
            totalPOQty += Number(item.qty) || 0;
          }
        });
      }
    });
    return totalPOQty;
  };

  // FIXED: Enhanced function (prefixed with underscore because it's not used directly)
  const _getAvailableStockForIndent = (itemCode: string, indentIndex: number, itemQty: number) => {
    const totalStock = getStock(itemCode);
    const previousAllocatedQty = getCumulativeAllocatedQtyUpTo(itemCode, indentIndex);
    const availableBefore = totalStock - previousAllocatedQty;
    const availableAfter = availableBefore - (Number(itemQty) || 0);
    return availableAfter;
  };
  void _getAvailableStockForIndent;

  // FIXED: Enhanced allocation function
  const getAllocatedAvailableForIndent = (itemCode: string, indentIndex: number, itemQty: number) => {
    const totalStock = getStock(itemCode);
    const previousAllocatedQty = getCumulativeAllocatedQtyUpTo(itemCode, indentIndex);
    const availableBefore = totalStock - previousAllocatedQty;

    const nonNegativeAvailableBefore = Math.max(0, availableBefore);
    const allocatedForThisIndent = Math.min(nonNegativeAvailableBefore, Number(itemQty) || 0);
    return allocatedForThisIndent;
  };

  // FIXED: Calculate status - CLOSED only when availableBefore >= requested qty
  const _getIndentStatus = (itemCode: string, indentIndex: number, itemQty: number) => {
    const totalStock = getStock(itemCode);
    const previousAllocatedQty = getCumulativeAllocatedQtyUpTo(itemCode, indentIndex);
    const availableBefore = totalStock - previousAllocatedQty;
    
    return availableBefore >= (Number(itemQty) || 0);
  };
  void _getIndentStatus;


  // Calculate remaining stock after all allocations
  const getRemainingStock = (itemCode: string) => {
    const totalStock = Number(getStock(itemCode) || 0);
    const poQty = Number(getPOQuantity(itemCode) || 0);

    // Start from stock + PO (POs increase future availability)
    let available = totalStock + poQty;

    // Subtract allocations from saved indents (in order)
    indents.forEach((indent, indentIndex) => {
      indent.items.forEach(item => {
        if (item.itemCode === itemCode) {
          const allocated = getAllocatedAvailableForIndent(itemCode, indentIndex, item.qty);
          available -= Number(allocated) || 0;
        }
      });
    });

    // Also subtract allocations from items already added to the current (unsaved) indent
    // This treats `newIndent` as the last indent in order and allocates sequentially
    (newIndent.items || []).forEach(item => {
=======
      unsubRefs.current.forEach(fn => { try { fn(); } catch {} });
    };
  }, []);

  // ─── Stock map (memoized) ──────────────────────────────────────────────────
  const stockMap = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    const norm = (v: any) => String(v ?? '').trim().toUpperCase();
    const alpha = (v: any) => norm(v).replace(/[^A-Z0-9]/g, '');

    for (const s of stockRecords) {
      const candidates = [s.itemCode, s.ItemCode, s.code, s.Code, s.item_code, s.itemName, s.ItemName, s.name, s.Name, s.sku, s.SKU];
      const key = candidates.map(norm).find(c => c) || '';
      if (!key) continue;

      const closingKeys = ['closingStock','closing_stock','ClosingStock','closing','closingQty','closing_qty','Closing','closing stock','Closing Stock'];
      let val: number | null = null;
      for (const k of closingKeys) {
        if (s[k] != null && !isNaN(Number(s[k]))) { val = Number(s[k]); break; }
      }
      if (val === null) {
        const sq = Number(s.stockQty || s.stock_qty || s.stock || s.StockQty || s.currentStock || 0);
        const po = Number(s.purStoreOkQty || s.PurStoreOkQty || 0);
        const vo = Number(s.vendorOkQty || s.VendorOkQty || 0);
        const ih = Number(s.inHouseIssuedQty || s.InHouseIssuedQty || 0);
        val = sq + po + vo - ih;
      }
      map.set(key, val);
      const ak = alpha(key);
      if (ak && !map.has('~' + ak)) map.set('~' + ak, val);
    }
    return map;
  }, [stockRecords]);

  const getStock = useCallback((itemCode: string): number => {
    if (!itemCode) return 0;
    const norm = (v: any) => String(v ?? '').trim().toUpperCase();
    const alpha = (v: any) => norm(v).replace(/[^A-Z0-9]/g, '');
    const key = norm(itemCode);
    if (stockMap.has(key)) return stockMap.get(key)!;
    const ak = '~' + alpha(itemCode);
    if (stockMap.has(ak)) return stockMap.get(ak)!;
    return 0;
  }, [stockMap]);

  // ─── PO map ───────────────────────────────────────────────────────────────
  const poMap = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const po of purchaseOrders) {
      if (!Array.isArray(po.items)) continue;
      for (const item of po.items) {
        const code = String(item.itemCode || '').trim().toUpperCase();
        if (!code) continue;
        map.set(code, (map.get(code) || 0) + (Number(item.qty) || 0));
      }
    }
    return map;
  }, [purchaseOrders]);

  const getPOQuantity = useCallback((itemCode: string) => {
    return poMap.get(String(itemCode).trim().toUpperCase()) || 0;
  }, [poMap]);

  // ─── Indent analysis ──────────────────────────────────────────────────────
  // ✅ ROOT CAUSE FIX: Firestore returns docs in insertion order.
  // If S-8/25-02 was saved after S-8/25-01, the array may arrive as [02, 01].
  // We must sort ascending by serial number BEFORE iterating cumulativeAllocated,
  // otherwise Prev Qty is 0 for 01 and 30 for 02 — exactly backwards.
  const indentAnalysisRows = useMemo(() => {
    const rows: Array<{
      indentNo: string; date: string; indentBy: string; oaNo: string;
      model: string; itemCode: string; qty: number;
      totalStock: number; previousIndentsQty: number; poQuantity: number;
      availableForThisIndent: number; allocatedAvailable: number; isClosed: boolean;
    }> = [];

    // Sort ascending by trailing serial number: S-8/25-01 → S-8/25-02 → …
    const sortedIndents = [...indents].sort((a, b) => {
      const parse = (no: string) => {
        const m = no.match(/(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      };
      return parse(a.indentNo) - parse(b.indentNo);
    });

    // Cumulative ALLOCATED qty per normalised item code
    const cumulativeAllocated = new Map<string, number>();

    for (const indent of sortedIndents) {
      for (const item of indent.items) {
        // Normalise code for consistent map lookups
        const code = String(item.itemCode || '').trim().toUpperCase();
        const totalStock = getStock(code) || getStock(item.itemCode);
        const poQuantity = getPOQuantity(code) || getPOQuantity(item.itemCode);

        const previousIndentsQty = cumulativeAllocated.get(code) || 0;

        // Stock left BEFORE this indent consumes anything
        const availableBefore = totalStock - previousIndentsQty;

        // CLOSED = enough stock to fully satisfy this indent
        const isClosed = availableBefore >= (Number(item.qty) || 0);

        // Actual amount allocated = min(what's available, what's requested) — never < 0
        const allocatedAvailable = Math.min(Math.max(0, availableBefore), Number(item.qty) || 0);

        // Net after this indent (negative = shortfall shown in red)
        const availableForThisIndent =
          (totalStock + poQuantity) - previousIndentsQty - (Number(item.qty) || 0);

        rows.push({
          indentNo:  indent.indentNo,
          date:      indent.date,
          indentBy:  indent.indentBy,
          oaNo:      indent.oaNo,
          model:     item.model,
          itemCode:  item.itemCode,   // original for display
          qty:       Number(item.qty) || 0,
          totalStock,
          previousIndentsQty,
          poQuantity,
          availableForThisIndent,
          allocatedAvailable,
          isClosed,
        });

        // Accumulate ALLOCATED (not requested) — partial open indents still
        // consume partial stock, reducing availability for later indents
        cumulativeAllocated.set(code, previousIndentsQty + allocatedAvailable);
      }
    }

    return rows;
  }, [indents, getStock, getPOQuantity]);

  // O(1) helpers derived from memoized rows
  const getAllocatedStock = useCallback((itemCode: string) => {
    return indentAnalysisRows
      .filter(r => r.itemCode === itemCode)
      .reduce((sum, r) => sum + r.allocatedAvailable, 0);
  }, [indentAnalysisRows]);

  const getRemainingStock = useCallback((itemCode: string) => {
    const totalStock = getStock(itemCode);
    const poQty = getPOQuantity(itemCode);
    const allocated = getAllocatedStock(itemCode);
    let available = totalStock + poQty - allocated;
    for (const item of newIndent.items) {
>>>>>>> ea2b60370e32f18454b4b30c524aa7881340b2ee
      if (item.itemCode === itemCode) {
        const alloc = Math.min(Math.max(0, available), Number(item.qty) || 0);
        available -= alloc;
      }
<<<<<<< HEAD
    });

    return available;
  };

  // Calculate total allocated stock (actual allocated amounts)
  const getAllocatedStock = (itemCode: string) => {
    let totalAllocatedQty = 0;
    
    indents.forEach((indent, indentIndex) => {
      indent.items.forEach(item => {
        if (item.itemCode === itemCode) {
          const allocated = getAllocatedAvailableForIndent(itemCode, indentIndex, item.qty);
          totalAllocatedQty += allocated;
        }
      });
    });
    
    return totalAllocatedQty;
  };

  // FIXED: Comprehensive analysis function
  const getIndentAnalysis = (itemCode: string, indentIndex: number, itemQty: number) => {
    const totalStock = getStock(itemCode);
    const previousAllocatedQty = getCumulativeAllocatedQtyUpTo(itemCode, indentIndex);
    const poQuantity = getPOQuantity(itemCode);
    const availableBefore = totalStock - previousAllocatedQty;
    const availableForThisIndent = (totalStock + poQuantity) - previousAllocatedQty - (Number(itemQty) || 0);
    const allocatedAvailable = Math.min(Math.max(0, availableBefore), Number(itemQty) || 0);
    const isClosed = availableBefore >= (Number(itemQty) || 0);
    
    return {
      totalStock,
      previousIndentsQty: previousAllocatedQty,
      poQuantity,
      availableForThisIndent,
      allocatedAvailable,
      isClosed,
      calculation: `${totalStock} - ${previousAllocatedQty} = ${availableBefore} (before) - ${itemQty} = ${availableForThisIndent}`
    };
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'itemName') {
      const found = itemMaster.find(item => item.itemName === value);
      setItemInput({ 
        ...itemInput, 
        model: value, 
        itemCode: found ? found.itemCode : '' 
      });
    }
  };

  const handleAddItem = () => {
    if (!itemInput.model || !itemInput.itemCode || isNaN(Number(itemInput.qty)) || Number(itemInput.qty) <= 0) {
      alert('Please fill in Item Name, Item Code, and a valid Quantity');
      return;
    }

    if (editIdx !== null) {
      setNewIndent(prev => ({
        ...prev,
        items: prev.items.map((item, idx) => (idx === editIdx ? itemInput : item)),
      }));
      setEditIdx(null);
    } else {
      setNewIndent(prev => ({
        ...prev,
        items: [...prev.items, itemInput],
      }));
    }
    
    setItemInput({ model: '', itemCode: '', qty: 0, indentClosed: false });
  };

  const handleEditItem = (idx: number) => {
    setItemInput(newIndent.items[idx]);
    setEditIdx(idx);
  };

  const handleAddIndent = () => {
    if (!newIndent.date || !newIndent.indentBy || !newIndent.oaNo) {
      alert('Please fill in Date, Indent By, and OA NO fields');
      return;
    }
    if (newIndent.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    // LOG: Stock analysis for informational purposes (no blocking)
    let insufficientStockItems: Array<{ model: string; itemCode: string; requested: number; available: number }> = [];
    
    console.log('[IndentModule] Stock analysis started. Total stock records available:', stockRecords?.length || 0);
    
    newIndent.items.forEach(item => {
      const totalStock = getStock(item.itemCode);
      const requestedQty = Number(item.qty) || 0;
      
      console.log(`[IndentModule] Analyzing ${item.model} (${item.itemCode}): Requested=${requestedQty}, Available=${totalStock}, Status=${requestedQty > totalStock ? 'INSUFFICIENT' : 'OK'}`);
      
      if (requestedQty > totalStock) {
        insufficientStockItems.push({
          model: item.model,
          itemCode: item.itemCode,
          requested: requestedQty,
          available: totalStock
        });
      }
    });

    console.log('[IndentModule] Analysis complete. Items with insufficient stock:', insufficientStockItems);

    // Show warning but allow proceeding
    if (insufficientStockItems.length > 0) {
      const itemsList = insufficientStockItems
        .map(i => `${i.model} (${i.itemCode}): Requested ${i.requested} but only ${i.available} available`)
        .join('\n');
      
      console.warn(`⚠️ INSUFFICIENT STOCK DETECTED:\n\n${itemsList}`);
    }

    const indentNo = getNextIndentNo();
    const updated = [...indents, { ...newIndent, indentNo }];
    setIndents(updated);
    
    // Save to Firestore instead of localStorage
    replaceFirestoreCollection(uid, 'indentData', updated).catch(err => {
      console.error('Failed to save indent data to Firestore:', err);
      alert('Failed to save indent. Please try again.');
    });

    // Reset form
    setNewIndent({ indentNo: getNextIndentNo(), date: '', indentBy: '', oaNo: '', items: [] });
    setItemInput({ model: '', itemCode: '', qty: 0, indentClosed: false });
  };

  function exportToExcel() {
    const rows = indents.flatMap((indent, indentIndex) =>
        indent.items.map(item => {
        const analysis = getIndentAnalysis(item.itemCode, indentIndex, item.qty);
        const remainingStock = getRemainingStock(item.itemCode);
        const allocatedStock = getAllocatedStock(item.itemCode);

        return {
          Date: indent.date,
          'Indent No': indent.indentNo,
          Model: item.model,
          'Item Code': item.itemCode,
          Qty: item.qty,
          'Indent By': indent.indentBy,
          'OA NO': indent.oaNo,
          'Total Stock': analysis.totalStock,
          'Previous Indents Qty': analysis.previousIndentsQty,
          'PO Quantity': analysis.poQuantity,
          'Available for This Indent': analysis.availableForThisIndent,
          'Allocated Available': analysis.allocatedAvailable,
          'Remaining Stock': remainingStock,
          'Allocated Stock': allocatedStock,
          'Indent Closed': analysis.isClosed ? 'Yes' : 'No',
          'Calculation': analysis.calculation,
        };
      })
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Indents');
    XLSX.writeFile(wb, 'Indents.xlsx');
  }

  // Prepare debug rows for UI panel
  const debugRows = indents.flatMap((indent, indentIndex) =>
    (indent.items || []).map((item: any) => {
      const analysis = getIndentAnalysis(item.itemCode, indentIndex, item.qty);
      const availableBefore = (analysis.totalStock || 0) - (analysis.previousIndentsQty || 0);
      return {
        indentNo: indent.indentNo,
        date: indent.date,
        indentBy: indent.indentBy,
        oaNo: indent.oaNo,
        itemName: item.model,
        itemCode: item.itemCode,
        qty: Number(item.qty) || 0,
        totalStock: analysis.totalStock || 0,
        previousIndentsQty: analysis.previousIndentsQty || 0,
        poQuantity: analysis.poQuantity || 0,
        availableBefore,
        availableForThisIndent: analysis.availableForThisIndent,
        allocatedAvailable: analysis.allocatedAvailable,
        isClosed: analysis.isClosed,
        calculation: analysis.calculation,
      };
    })
  );

  // One-shot fetch from Firestore for stock-records (useful to force-refresh)
  const fetchStockOnce = async () => {
    try {
      const docs = await getFirestoreDocs(uid, 'stock-records');
      setStockRecords(docs || []);
      console.log('[IndentModule] fetchStockOnce: fetched', docs?.length || 0, 'stock records');
      // Trigger recompute
      try { bus.dispatchEvent(new CustomEvent('stock.updated')); } catch (err) { }
      alert('Fetched stock-records from Firestore (' + (docs?.length || 0) + ')');
    } catch (err) {
      console.error('[IndentModule] fetchStockOnce error', err);
      alert('Failed to fetch stock-records: ' + String(err));
    }
  };

  // Compute and publish open/closed indent items
  const computeAndPublishIndentItems = (sourceIndents: any[]) => {
    try {
      const openItems: any[] = [];
      const closedItems: any[] = [];

      (sourceIndents || []).forEach((indent: any, indentIndex: number) => {
        (indent.items || []).forEach((item: any) => {
          const analysis = getIndentAnalysis(item.itemCode, indentIndex, item.qty);

          const payload = {
            ...item,
            indentNo: indent.indentNo,
            date: indent.date,
            indentBy: indent.indentBy,
            oaNo: indent.oaNo,
            stock: analysis.totalStock,
            availableForThisIndent: analysis.availableForThisIndent,
            qty1: analysis.allocatedAvailable,
            Item: item.model,
            Code: item.itemCode,
          };

          if (analysis.isClosed) closedItems.push(payload);
          else openItems.push(payload);
        });
      });

      console.log('[IndentModule] Saving indent items:', { openItemsCount: openItems.length, closedItemsCount: closedItems.length });
      
      // Save to Firestore instead of localStorage
      replaceFirestoreCollection(uid, 'openIndentItems', openItems).catch(err => {
        console.error('Failed to save open indent items:', err);
      });
      replaceFirestoreCollection(uid, 'closedIndentItems', closedItems).catch(err => {
        console.error('Failed to save closed indent items:', err);
      });

      try {
        bus.dispatchEvent(new CustomEvent('indents.updated', { detail: { openItems, closedItems } }));
      } catch (err) {
        console.error('[IndentModule] Error dispatching indents.updated:', err);
      }
    } catch (err) {
      console.error('[IndentModule] computeAndPublishIndentItems error:', err);
    }
  };

  // Auto-save OPEN and CLOSED indent items for Purchase module and notify via event bus
  useEffect(() => {
    computeAndPublishIndentItems(indents);
  }, [indents]);

  // Listen for stock updates elsewhere in the app and force a recompute
  useEffect(() => {
    const handler = () => {
      setIndents(prev => {
        computeAndPublishIndentItems(prev as any[]);
        return Array.isArray(prev) ? [...prev] : prev;
      });
    };

    try {
      bus.addEventListener('stock.updated', handler as EventListener);
    } catch (err) {
      console.error('[IndentModule] Error registering stock.updated listener:', err);
    }

    return () => {
      try {
        bus.removeEventListener('stock.updated', handler as EventListener);
      } catch (err) {
        console.error('[IndentModule] Error removing stock.updated listener:', err);
      }
    };
  }, []);

  // Also listen for storage events
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      try {
        if (!e.key) return;
        const interestingKeys = ['stock-records', 'indentData', 'purchaseOrders'];
        if (interestingKeys.includes(e.key)) {
          computeAndPublishIndentItems(indents as any[]);
          setIndents(prev => Array.isArray(prev) ? [...prev] : prev);
        }
      } catch (err) {
        console.error('[IndentModule] onStorage handler error:', err);
      }
    };

    try {
      window.addEventListener('storage', onStorage);
    } catch (err) {
      console.error('[IndentModule] Error registering storage listener:', err);
    }

    return () => {
      try {
        window.removeEventListener('storage', onStorage);
      } catch (err) {
        console.error('[IndentModule] Error removing storage listener:', err);
      }
    };
  }, [indents]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Indent Module</h2>
      
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input 
          placeholder="Indent No" 
          value={newIndent.indentNo} 
          disabled 
          style={{ background: '#eee', padding: 8, borderRadius: 4, border: '1px solid #ccc' }} 
        />
        <input
          type="date"
          value={newIndent.date}
          onChange={e => setNewIndent({ ...newIndent, date: e.target.value })}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <select 
          value={newIndent.indentBy} 
          onChange={e => {
            const selectedIndentBy = e.target.value;
            const nextOANo = getNextOANo(selectedIndentBy);
            setNewIndent({ ...newIndent, indentBy: selectedIndentBy, oaNo: nextOANo });
          }}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        >
          <option value="">Indent By</option>
          <option value="HKG">HKG</option>
          <option value="NGR">NGR</option>
          <option value="MDD">MDD</option>
        </select>
        <input
          placeholder="OA NO"
          value={newIndent.oaNo}
          onChange={e => setNewIndent({ ...newIndent, oaNo: e.target.value })}
          onBlur={() => {
            // Auto-format if user entered just "Stock" (case-insensitive) without number
            if (newIndent.oaNo.trim().toLowerCase() === 'stock' && newIndent.indentBy) {
              const formatted = getNextOANo(newIndent.indentBy, newIndent.oaNo);
              if (formatted) {
                setNewIndent({ ...newIndent, oaNo: formatted });
              }
            }
          }}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <button 
          onClick={() => {
            if (!newIndent.indentBy) {
              alert('Please select Indent By first');
              return;
            }
            // Generate next OA NO for Stock entries
            const formatted = getNextOANo(newIndent.indentBy, 'Stock');
            if (formatted) {
              setNewIndent({ ...newIndent, oaNo: formatted });
            }
          }}
          style={{
            background: '#2196F3',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Auto Generate
        </button>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>Item Name:</label>
        <select 
          name="itemName" 
          value={itemInput.model} 
          onChange={handleChange}
          style={{ 
            padding: 8, 
            borderRadius: 4, 
            border: itemMaster.length === 0 ? '2px solid red' : '1px solid #ccc',
            minWidth: 200
          }}
        >
          <option value="">
            {itemMaster.length === 0 ? "No items in Item Master" : "Select Item Name"}
          </option>
          {itemMaster.map(item => (
            <option key={item.itemCode} value={item.itemName}>
              {item.itemName} - {item.itemCode}
            </option>
          ))}
        </select>
        <input
          placeholder="Item Code"
          value={itemInput.itemCode}
          readOnly
          style={{ 
            padding: 8, 
            borderRadius: 4, 
            border: '1px solid #ccc',
            background: '#f5f5f5',
            cursor: 'not-allowed'
          }}
        />
        <input
          type="number"
          placeholder="Qty"
          value={itemInput.qty === 0 ? '' : itemInput.qty}
          onChange={e => setItemInput({ ...itemInput, qty: e.target.value === '' ? 0 : Number(e.target.value) })}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', width: 100 }}
        />
        <button 
          onClick={handleAddItem}
          style={{
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            cursor: 'pointer',
          }}
        >
          {editIdx !== null ? 'Update Item' : 'Add Item'}
        </button>
      </div>

      {newIndent.items.length > 0 && (
        <table border={1} cellPadding={8} style={{ width: '100%', marginBottom: 16, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#e3e6f3' }}>
              <th>Item Name</th>
              <th>Item Code</th>
              <th>Qty Requested</th>
              <th>Available Stock</th>
              <th>Remaining Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {newIndent.items.map((item, idx) => {
              // Calculate remaining stock after saved indents + pending items in this form
              const totalStock = getStock(item.itemCode);
              let totalAllocatedFromSaved = 0;
              
              // Add allocations from saved indents
              indents.forEach((indent, indentIndex) => {
                indent.items.forEach(savedItem => {
                  if (savedItem.itemCode === item.itemCode) {
                    const allocated = getAllocatedAvailableForIndent(item.itemCode, indentIndex, savedItem.qty);
                    totalAllocatedFromSaved += allocated;
                  }
                });
              });
              
              // Add allocations from pending items in current form (up to this item)
              let totalAllocatedFromPending = 0;
              for (let i = 0; i <= idx; i++) {
                totalAllocatedFromPending += Number(newIndent.items[i].qty) || 0;
              }
              
              const remainingStock = totalStock - totalAllocatedFromSaved - totalAllocatedFromPending;
              const availableStock = getStock(item.itemCode);
              const hasInsufficientStock = Number(item.qty) > availableStock;
              
              return (
                <tr key={idx} style={{ 
                  background: hasInsufficientStock ? '#ffebee' : 'inherit'
                }}>
                  <td>{item.model}</td>
                  <td>{item.itemCode}</td>
                  <td>{item.qty}</td>
                  <td style={{
                    fontWeight: 600,
                    color: hasInsufficientStock ? '#e53935' : '#43a047'
                  }}>
                    {availableStock}
                  </td>
                  <td style={{ 
                    color: remainingStock >= 0 ? '#43a047' : '#e53935',
                    fontWeight: 600 
                  }}>
                    {remainingStock}
                  </td>
                  <td style={{
                    fontWeight: 600,
                    color: hasInsufficientStock ? '#e53935' : '#43a047'
                  }}>
                    {hasInsufficientStock ? '⚠️ INSUFFICIENT' : '✓ OK'}
                  </td>
                  <td>
                    <button
                      style={{
                        background: '#1976d2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 12px',
                        cursor: 'pointer',
                        marginRight: 4,
                      }}
                      onClick={() => handleEditItem(idx)}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setNewIndent(prev => ({
                          ...prev,
                          items: prev.items.filter((_, i) => i !== idx),
                        }));
                      }}
                      style={{
                        background: '#e53935',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 12px',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {newIndent.items.length > 0 && (() => {
        const stockValidation = newIndent.items.map(item => ({
          hasInsufficientStock: Number(item.qty) > getStock(item.itemCode)
        }));
        const insufficientCount = stockValidation.filter(s => s.hasInsufficientStock).length;
        const allValid = insufficientCount === 0;
        const stockRecordsLoaded = (stockRecords?.length || 0) > 0;

        return (
          <div style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 6,
            background: allValid && stockRecordsLoaded ? '#f1f8e9' : '#fff3e0',
            border: `2px solid ${allValid && stockRecordsLoaded ? '#43a047' : '#ff9800'}`
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              📋 Indent Summary:
            </div>
            <div>
              • Total Items: {newIndent.items.length}
            </div>
            <div>
              • Stock Records Loaded: {stockRecordsLoaded ? `✓ ${stockRecords?.length || 0} items` : '❌ Loading...'}
            </div>
            <div style={{ color: '#43a047', fontWeight: 600 }}>
              • ✓ Items with sufficient stock: {newIndent.items.length - insufficientCount}
            </div>
            {insufficientCount > 0 && (
              <div style={{ color: '#ff9800', fontWeight: 600 }}>
                • ⚠️ Items with INSUFFICIENT stock: {insufficientCount}
              </div>
            )}
            {!stockRecordsLoaded && (
              <div style={{ color: '#ff9800', fontWeight: 600, marginTop: 8 }}>
                ⚠️ Stock records not loaded yet. Please wait or refresh from Stock Module.
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ marginBottom: 24, display: 'flex', gap: 8 }}>
        <button 
          onClick={handleAddIndent} 
          disabled={newIndent.items.length === 0}
          style={{
            background: newIndent.items.length === 0 ? '#ccc' : '#43a047',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '10px 20px',
            fontWeight: 500,
            cursor: newIndent.items.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          Add Indent
        </button>
        <button
          onClick={exportToExcel}
          style={{
            background: '#ff9800',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '10px 20px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Export to Excel
        </button>
      </div>

      <h3>Indent Records</h3>
      <div style={{ overflowX: 'auto' }}>
        <table border={1} cellPadding={8} style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#e3e6f3' }}>
              <th>Date</th>
              <th>Indent No</th>
              <th>Item Name</th>
              <th>Item Code</th>
              <th>Qty</th>
              <th>Indent By</th>
              <th>OA NO</th>
              <th>Total Stock</th>
              <th>Previous Indents</th>
              <th>PO Quantity</th>
              <th>Available for Indent</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {indents.map((indent, indentIndex) =>
              indent.items.map((item, itemIdx) => {
                const analysis = getIndentAnalysis(item.itemCode, indentIndex, item.qty);
                // Compute available FOR this indent explicitly (includes PO quantity)
                const availableForIndent = (Number(analysis.totalStock || 0) + Number(analysis.poQuantity || 0)) - Number(analysis.previousIndentsQty || 0) - (Number(item.qty) || 0);

                // Debug log to help reproduce why values may appear as zero instead of negative
                if (availableForIndent < 0) {
                  console.debug('[IndentModule] Negative availableForIndent', { indentNo: indent.indentNo, itemCode: item.itemCode, totalStock: analysis.totalStock, poQuantity: analysis.poQuantity, previousIndentsQty: analysis.previousIndentsQty, itemQty: item.qty, availableForIndent });
                }
                
                return (
                  <tr key={`${indentIndex}-${itemIdx}`}>
                    <td>{indent.date}</td>
                    <td>{indent.indentNo}</td>
                    <td>{item.model}</td>
                    <td>{item.itemCode}</td>
                    <td>{item.qty}</td>
                    <td>{indent.indentBy}</td>
                    <td>{indent.oaNo}</td>
                    <td>{analysis.totalStock}</td>
                    <td>{analysis.previousIndentsQty}</td>
                    <td>{analysis.poQuantity}</td>
                    <td>
                      <span style={{
                        background: availableForIndent >= 0 ? '#43a047' : '#e53935',
                        color: '#fff',
                        fontWeight: 700,
                        padding: '6px 10px',
                        borderRadius: 6,
                        display: 'inline-block',
                        minWidth: 44,
                        textAlign: 'center'
                      }}>
                        {availableForIndent}
                      </span>
                    </td>
                    <td>
                      {analysis.isClosed ? (
                        <span style={{ 
                          background: '#43a047', 
                          color: '#fff', 
                          fontWeight: 600, 
                          padding: '4px 12px', 
                          borderRadius: 6,
                          display: 'inline-block',
                        }}>
                          CLOSED
                        </span>
                      ) : (
                        <span style={{ 
                          background: '#e53935', 
                          color: '#fff', 
                          fontWeight: 600, 
                          padding: '4px 12px', 
                          borderRadius: 6,
                          display: 'inline-block',
                        }}>
                          OPEN
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          const updatedIndents = indents.map((ind, idx) => {
                            if (idx !== indentIndex) return ind;
                            return {
                              ...ind,
                              items: ind.items.filter((_, i) => i !== itemIdx),
                            };
                          }).filter(ind => ind.items.length > 0);
                          setIndents(updatedIndents);
                          replaceFirestoreCollection(uid, 'indentData', updatedIndents).catch(err => {
                            console.error('Failed to update indent data:', err);
                          });
                        }}
                        style={{
                          background: '#e53935',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          padding: '4px 12px',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: 32,
        padding: 16,
        background: '#f5f5f5',
        border: '2px dashed #999',
        borderRadius: 4
      }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>🔍 CORRECTED INDENT LOGIC</h3>
        
        <div style={{ 
          padding: 12, 
          background: '#e8f5e8', 
          border: '1px solid #4caf50',
          borderRadius: 4,
          marginBottom: 16
        }}>
          <h4 style={{ color: '#2e7d32', marginTop: 0 }}>✅ CORRECTED LOGIC EXPLANATION</h4>
          <p><strong>Previous Problem:</strong> OPEN indents were not contributing to cumulative allocation</p>
          <p><strong>New Solution:</strong> Cumulative total includes ACTUAL allocated amounts from both CLOSED and OPEN indents</p>
          <p><strong>Correct Behavior:</strong></p>
          <ul>
            <li>Indent 1: 50 allocated → Cumulative: 50</li>
            <li>Indent 2: 40 allocated → Cumulative: 90</li>
            <li>Indent 3: 10 allocated (of 20) → Cumulative: 100</li>
            <li>Indent 4: 0 allocated (of 40) → Cumulative: 100</li>
          </ul>
          <p><strong>Result:</strong> Available Before for Indent 4 = 100 - 100 = 0 (not 10)</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ color: '#555' }}>Stock & Indent Analysis</h4>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <button
              onClick={() => {
                console.log('[IndentDebug] All Indents:', indents);
                const analysis: any[] = [];
                indents.forEach((indent, indentIndex) => {
                  indent.items.forEach((item) => {
                    const analysisData = getIndentAnalysis(item.itemCode, indentIndex, item.qty);
                    const remaining = getRemainingStock(item.itemCode);
                    const allocated = getAllocatedStock(item.itemCode);
                    analysis.push({
                      indentNo: indent.indentNo,
                      itemCode: item.itemCode,
                      indentQty: item.qty,
                      totalStock: analysisData.totalStock,
                      previousIndentsQty: analysisData.previousIndentsQty,
                      poQuantity: analysisData.poQuantity,
                      availableForThisIndent: analysisData.availableForThisIndent,
                      allocatedAvailable: analysisData.allocatedAvailable,
                      isClosed: analysisData.isClosed,
                      remainingStock: remaining,
                      allocatedStock: allocated,
                      calculation: analysisData.calculation,
                      status: analysisData.isClosed ? 'CLOSED' : 'OPEN'
                    });
                  });
                });
                console.log('[IndentDebug] Corrected Analysis:', analysis);
                alert(`Analyzed ${analysis.length} items. Check console for detailed breakdown.`);
              }}
              style={{
                padding: '8px 12px',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Analyze Corrected Indent Logic
            </button>

            <button
              onClick={() => setDebugOpen(d => !d)}
              style={{ padding: '8px 12px', background: '#1976d2', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              {debugOpen ? 'Hide' : 'Show'} Debug Panel
            </button>
          </div>

          {debugOpen && (
            <div style={{ marginTop: 8, padding: 12, background: '#fff', border: '1px solid #ddd', borderRadius: 6 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input placeholder="Filter (item code or name)" value={debugFilter} onChange={e => setDebugFilter(e.target.value)} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', minWidth: 240 }} />
                <button onClick={() => console.log('[IndentDebugPanel] rows:', debugRows)} style={{ padding: '8px 12px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Log Rows</button>
                <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(debugRows, null, 2)).then(()=>alert('Copied to clipboard'))} style={{ padding: '8px 12px', background: '#9c27b0', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Copy JSON</button>
                <button onClick={fetchStockOnce} style={{ padding: '8px 12px', background: '#607d8b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Refresh Stock (Firestore)</button>
              </div>

              <div style={{ maxHeight: 320, overflow: 'auto', borderTop: '1px solid #eee', paddingTop: 8 }}>
                <table border={1} cellPadding={8} style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f3f3f3' }}>
                      <th>Indent No</th>
                      <th>Item</th>
                      <th>Code</th>
                      <th>Qty</th>
                      <th>Total</th>
                      <th>Prev</th>
                      <th>PO</th>
                      <th>Available Before</th>
                      <th>Available After</th>
                      <th>Allocated</th>
                      <th>Calc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debugRows.filter(r => !debugFilter || String(r.itemCode).toLowerCase().includes(debugFilter.toLowerCase()) || String(r.itemName).toLowerCase().includes(debugFilter.toLowerCase())).map((r, i) => (
                      <tr key={i}>
                        <td>{r.indentNo}</td>
                        <td>{r.itemName}</td>
                        <td>{r.itemCode}</td>
                        <td>{r.qty}</td>
                        <td>{r.totalStock}</td>
                        <td>{r.previousIndentsQty}</td>
                        <td>{r.poQuantity}</td>
                        <td>{r.availableBefore}</td>
                        <td>{r.availableForThisIndent}</td>
                        <td>{r.allocatedAvailable}</td>
                        <td style={{ maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.calculation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
=======
    }
    return available;
  }, [getStock, getPOQuantity, getAllocatedStock, newIndent.items]);

  // ─── Indent numbering ─────────────────────────────────────────────────────
  const getNextIndentNo = useCallback((currentIndents: Indent[] = indents) => {
    const base = 'S-8/25-';
    if (currentIndents.length === 0) return base + '01';
    const lastSerial = Math.max(...currentIndents.map(i => {
      const match = i.indentNo.match(/S-8\/25-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }));
    return base + String(lastSerial + 1).padStart(2, '0');
  }, [indents]);

  useEffect(() => {
    setNewIndent(prev => prev.indentNo ? prev : { ...prev, indentNo: getNextIndentNo() });
  }, [indents]);

  const getNextOANo = useCallback((indentByValue: string, currentOANo: string = ''): string => {
    if (!indentByValue) return '';
    if (currentOANo.trim() === 'Stock') {
      const nums = indents
        .filter(i => i.indentBy === indentByValue && /Stock\s+(\d+)/i.test(i.oaNo))
        .map(i => parseInt(i.oaNo.match(/Stock\s+(\d+)/i)![1], 10));
      const max = nums.length > 0 ? Math.max(...nums) : 0;
      return 'Stock ' + String(max + 1).padStart(2, '0');
    }
    const relNums = indents
      .filter(i => i.indentBy === indentByValue && /Stock\s+(\d+)/i.test(i.oaNo))
      .map(i => parseInt(i.oaNo.match(/Stock\s+(\d+)/i)![1], 10));
    if (relNums.length === 0) return '';
    return 'Stock ' + String(Math.max(...relNums) + 1).padStart(2, '0');
  }, [indents]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'itemName') {
      const found = itemMaster.find(i => i.itemName === value);
      setItemInput(prev => ({ ...prev, model: value, itemCode: found ? found.itemCode : '' }));
    }
  }, [itemMaster]);

  const handleAddItem = useCallback(() => {
    if (!itemInput.model || !itemInput.itemCode || isNaN(Number(itemInput.qty)) || Number(itemInput.qty) <= 0) {
      showToast('Please fill in Item Name, Item Code, and a valid Quantity', 'error');
      return;
    }
    if (editIdx !== null) {
      setNewIndent(prev => ({ ...prev, items: prev.items.map((item, idx) => idx === editIdx ? itemInput : item) }));
      setEditIdx(null);
      showToast('Item updated', 'success');
    } else {
      setNewIndent(prev => ({ ...prev, items: [...prev.items, itemInput] }));
    }
    setItemInput({ model: '', itemCode: '', qty: 0, indentClosed: false });
  }, [itemInput, editIdx, showToast]);

  const handleAddIndent = useCallback(() => {
    if (!newIndent.date || !newIndent.indentBy || !newIndent.oaNo) {
      showToast('Please fill in Date, Indent By, and OA NO fields', 'error');
      return;
    }
    if (newIndent.items.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }

    const indentNo = getNextIndentNo();
    const updated = [...indents.filter(i => i.indentNo !== indentNo), { ...newIndent, indentNo }];

    setIndents(updated);
    replaceFirestoreCollection(uid, 'indentData', updated).then(() => {
      showToast(`Indent ${indentNo} saved successfully`, 'success');
    }).catch(() => {
      showToast('Failed to save indent. Please try again.', 'error');
    });

    setNewIndent({ indentNo: getNextIndentNo(updated), date: '', indentBy: '', oaNo: '', items: [] });
    setItemInput({ model: '', itemCode: '', qty: 0, indentClosed: false });
  }, [newIndent, indents, uid, getNextIndentNo, showToast]);

  // ─── Publish open/closed items ────────────────────────────────────────────
  useEffect(() => {
    if (indents.length === 0 && stockRecords.length === 0) return;
    const openItems: any[] = [];
    const closedItems: any[] = [];

    indentAnalysisRows.forEach(row => {
      const payload = {
        model: row.model, itemCode: row.itemCode, qty: row.qty,
        indentClosed: row.isClosed, indentNo: row.indentNo,
        date: row.date, indentBy: row.indentBy, oaNo: row.oaNo,
        stock: row.totalStock, availableForThisIndent: row.availableForThisIndent,
        qty1: row.allocatedAvailable, Item: row.model, Code: row.itemCode,
      };
      (row.isClosed ? closedItems : openItems).push(payload);
    });

    replaceFirestoreCollection(uid, 'openIndentItems', openItems).catch(() => {});
    replaceFirestoreCollection(uid, 'closedIndentItems', closedItems).catch(() => {});
    try { bus.dispatchEvent(new CustomEvent('indents.updated', { detail: { openItems, closedItems } })); } catch {}
  }, [indentAnalysisRows, uid]);

  useEffect(() => {
    const handler = () => setIndents(prev => [...prev]);
    try { bus.addEventListener('stock.updated', handler as EventListener); } catch {}
    return () => { try { bus.removeEventListener('stock.updated', handler as EventListener); } catch {} };
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && ['stock-records', 'indentData', 'purchaseOrders'].includes(e.key))
        setIndents(prev => [...prev]);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ─── Export CSV ───────────────────────────────────────────────────────────
  const exportToCSV = useCallback(() => {
    const headers = [
      'Date','Indent No','Model','Item Code','Qty','Indent By','OA NO',
      'Total Stock','Previous Indents Qty','PO Quantity',
      'Available for This Indent','Allocated Available',
      'Remaining Stock','Allocated Stock','Status',
    ];
    const today = new Date().toISOString().slice(0, 10);
    const rows = filteredRows.map(r => [
      r.date, r.indentNo, r.model, r.itemCode, r.qty, r.indentBy, r.oaNo,
      r.totalStock, r.previousIndentsQty, r.poQuantity,
      r.availableForThisIndent, r.allocatedAvailable,
      getRemainingStock(r.itemCode), getAllocatedStock(r.itemCode),
      r.isClosed ? 'CLOSED' : 'OPEN',
    ]);
    const escape = (v: any) => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Indents_${today}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filteredRows.length} rows`, 'success');
  }, [indentAnalysisRows, getRemainingStock, getAllocatedStock, showToast]);

  // ─── Filtered rows ────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return indentAnalysisRows.filter(r => {
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'CLOSED' && !r.isClosed) return false;
        if (filterStatus === 'OPEN' && r.isClosed) return false;
      }
      if (filterDateFrom && r.date < filterDateFrom) return false;
      if (filterDateTo && r.date > filterDateTo) return false;
      if (filterText) {
        const q = filterText.toLowerCase();
        if (![r.model, r.itemCode, r.indentNo, r.indentBy, r.oaNo].some(f => String(f).toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [indentAnalysisRows, filterStatus, filterDateFrom, filterDateTo, filterText]);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = indentAnalysisRows.length;
    const closed = indentAnalysisRows.filter(r => r.isClosed).length;
    return { total, closed, open: total - closed, totalIndents: new Set(indentAnalysisRows.map(r => r.indentNo)).size };
  }, [indentAnalysisRows]);

  const pendingStats = useMemo(() => {
    const insufficient = newIndent.items.filter(i => Number(i.qty) > getStock(i.itemCode)).length;
    return { insufficient, total: newIndent.items.length };
  }, [newIndent.items, getStock]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .im-btn:hover { opacity: 0.88; }
        .im-row:hover td { background: #F7F8FF !important; }
        .im-input:focus { border-color: #3B5BDB !important; box-shadow: 0 0 0 3px rgba(59,91,219,0.12); }
        .im-ghost:hover { background: #F7F8FC !important; border-color: #CBD2E0 !important; }
        .im-danger-btn:hover { background: #FFF5F5 !important; }
        .im-edit-btn:hover { background: #C5D0FA !important; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background: #F1F3F9; border-radius:3px; }
        ::-webkit-scrollbar-thumb { background: #CBD2E0; border-radius:3px; }
      `}</style>

      <ToastContainer toasts={toasts} />

      <div style={{ background: S.bg, minHeight: '100vh', fontFamily: "'Geist', 'DM Sans', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 48px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: S.textPrimary, letterSpacing: '-0.02em' }}>
                Indent Management
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: S.textSecondary }}>
                Track and manage material indents with live stock analysis
              </p>
            </div>
            <button className="im-btn im-ghost" style={{ ...S.btnGhost }} onClick={exportToCSV}>
              ↓ Export CSV
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
            <StatCard label="Total Indents" value={stats.totalIndents} />
            <StatCard label="Total Lines" value={stats.total} />
            <StatCard label="Open Lines" value={stats.open} color={S.danger} sub="Awaiting stock" />
            <StatCard label="Closed Lines" value={stats.closed} color={S.success} sub="Fulfilled" />
            <StatCard label="Item Master" value={itemMaster.length} color={itemMaster.length === 0 ? S.warning : S.textPrimary} sub={itemMaster.length === 0 ? 'Loading…' : 'items loaded'} />
            <StatCard label="Stock Records" value={stockRecords.length} color={stockRecords.length === 0 ? S.warning : S.textPrimary} sub={stockRecords.length === 0 ? 'Loading…' : 'records loaded'} />
          </div>

          {/* Create Indent Form */}
          <div style={{ ...S.card, marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: S.textPrimary }}>New Indent</h2>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
              <Field label="Indent No">
                <input className="im-input" style={{ ...S.inputDisabled, width: 140 }} value={newIndent.indentNo || getNextIndentNo()} disabled />
              </Field>
              <Field label="Date">
                <input type="date" className="im-input" style={{ ...S.input, width: 160 }} value={newIndent.date} onChange={e => setNewIndent(p => ({ ...p, date: e.target.value }))} />
              </Field>
              <Field label="Indent By">
                <select className="im-input" style={{ ...S.input, width: 140 }} value={newIndent.indentBy}
                  onChange={e => { const v = e.target.value; setNewIndent(p => ({ ...p, indentBy: v, oaNo: getNextOANo(v) })); }}>
                  <option value="">Select…</option>
                  <option value="HKG">HKG</option>
                  <option value="NGR">NGR</option>
                  <option value="MDD">MDD</option>
                </select>
              </Field>
              <Field label="OA No">
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="im-input" style={{ ...S.input, width: 160 }} placeholder="e.g. OA-1234" value={newIndent.oaNo}
                    onChange={e => setNewIndent(p => ({ ...p, oaNo: e.target.value }))}
                    onBlur={() => {
                      if (newIndent.oaNo.trim().toLowerCase() === 'stock' && newIndent.indentBy) {
                        const f = getNextOANo(newIndent.indentBy, newIndent.oaNo);
                        if (f) setNewIndent(p => ({ ...p, oaNo: f }));
                      }
                    }}
                  />
                  <button className="im-btn" style={{ ...S.btnGhost, padding: '8px 12px', fontSize: 13 }} title="Auto-generate Stock OA No"
                    onClick={() => {
                      if (!newIndent.indentBy) { showToast('Select Indent By first', 'error'); return; }
                      const f = getNextOANo(newIndent.indentBy, 'Stock');
                      if (f) setNewIndent(p => ({ ...p, oaNo: f }));
                    }}>Auto</button>
                </div>
              </Field>
            </div>

            <div style={{ borderTop: `1px dashed ${S.border}`, margin: '0 0 20px' }} />

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <Field label="Item Name">
                <select name="itemName" className="im-input"
                  style={{ ...S.input, minWidth: 260, borderColor: itemMaster.length === 0 ? S.warning : S.borderStrong }}
                  value={itemInput.model} onChange={handleChange}>
                  <option value="">{itemMaster.length === 0 ? 'Loading item master…' : 'Select item…'}</option>
                  {itemMaster.map(item => (
                    <option key={item.itemCode} value={item.itemName}>{item.itemName} — {item.itemCode}</option>
                  ))}
                </select>
              </Field>
              <Field label="Item Code">
                <input className="im-input" style={{ ...S.inputDisabled, width: 140 }} value={itemInput.itemCode} readOnly placeholder="Auto-filled" />
              </Field>
              <Field label="Quantity">
                <input type="number" className="im-input" style={{ ...S.input, width: 100 }} placeholder="0"
                  value={itemInput.qty === 0 ? '' : itemInput.qty}
                  onChange={e => setItemInput(p => ({ ...p, qty: e.target.value === '' ? 0 : Number(e.target.value) }))}
                  min={1} />
              </Field>
              {itemInput.itemCode && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: 13,
                  background: getStock(itemInput.itemCode) > 0 ? S.successLight : S.dangerLight,
                  color: getStock(itemInput.itemCode) > 0 ? S.success : S.danger,
                  fontWeight: 600, alignSelf: 'flex-end',
                }}>
                  Stock: {getStock(itemInput.itemCode)}
                </div>
              )}
              <div style={{ alignSelf: 'flex-end' }}>
                <button className="im-btn" style={{ ...S.btnPrimary, background: editIdx !== null ? '#7048E8' : S.accent }} onClick={handleAddItem}>
                  {editIdx !== null ? '✎ Update Item' : '+ Add Item'}
                </button>
              </div>
            </div>

            {newIndent.items.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{
                  padding: '12px 16px', background: pendingStats.insufficient > 0 ? S.warningLight : S.successLight,
                  border: `1px solid ${pendingStats.insufficient > 0 ? '#FFE066' : '#A9E6B8'}`,
                  borderRadius: 8, marginBottom: 12, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: S.textPrimary }}>{newIndent.items.length} item{newIndent.items.length !== 1 ? 's' : ''} queued</span>
                  {pendingStats.insufficient > 0
                    ? <span style={{ fontSize: 13, color: S.warning, fontWeight: 600 }}>⚠ {pendingStats.insufficient} item{pendingStats.insufficient !== 1 ? 's' : ''} with insufficient stock</span>
                    : <span style={{ fontSize: 13, color: S.success, fontWeight: 600 }}>✓ All items have sufficient stock</span>}
                </div>

                <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${S.border}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...S.th, minWidth: 180 }}>Item Name</th>
                        <th style={{ ...S.th, minWidth: 110 }}>Item Code</th>
                        <th style={{ ...S.thRight, minWidth: 60 }}>Qty</th>
                        <th style={{ ...S.thRight, minWidth: 80 }}>Available</th>
                        <th style={{ ...S.thRight, minWidth: 90 }}>Remaining</th>
                        <th style={{ ...S.th, textAlign: 'center', minWidth: 80 }}>Status</th>
                        <th style={{ ...S.th, textAlign: 'center', minWidth: 100 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newIndent.items.map((item, idx) => {
                        const avail = getStock(item.itemCode);
                        const insufficient = Number(item.qty) > avail;
                        let cumulativePending = 0;
                        for (let i = 0; i <= idx; i++) cumulativePending += Number(newIndent.items[i].qty) || 0;
                        const remaining = avail - getAllocatedStock(item.itemCode) - cumulativePending;
                        return (
                          <tr key={idx} className="im-row" style={{ background: insufficient ? '#FFF9F9' : 'inherit' }}>
                            <td style={S.tdClip} title={item.model}>{item.model}</td>
                            <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 13 }}>{item.itemCode}</td>
                            <td style={{ ...S.tdRight, fontWeight: 600 }}>{item.qty}</td>
                            <td style={{ ...S.tdRight, color: insufficient ? S.danger : S.success, fontWeight: 600 }}>{avail}</td>
                            <td style={{ ...S.tdRight, color: remaining >= 0 ? S.success : S.danger, fontWeight: 600 }}>{remaining}</td>
                            <td style={{ ...S.td, textAlign: 'center' }}>
                              {insufficient ? <span style={{ fontSize: 12, color: S.warning, fontWeight: 700 }}>⚠ LOW</span>
                                           : <span style={{ fontSize: 12, color: S.success, fontWeight: 700 }}>✓ OK</span>}
                            </td>
                            <td style={{ ...S.td, textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                <button className="im-btn im-edit-btn" style={S.btnEdit}
                                  onClick={() => { setItemInput(newIndent.items[idx]); setEditIdx(idx); }}>Edit</button>
                                <button className="im-btn im-danger-btn" style={S.btnDanger}
                                  onClick={() => setNewIndent(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}>✕</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                  <button className="im-btn" style={{ ...S.btnSuccess, opacity: newIndent.items.length === 0 ? 0.5 : 1, cursor: newIndent.items.length === 0 ? 'not-allowed' : 'pointer' }}
                    onClick={handleAddIndent} disabled={newIndent.items.length === 0}>✓ Save Indent</button>
                  <button className="im-btn im-ghost" style={S.btnGhost}
                    onClick={() => { setNewIndent({ indentNo: getNextIndentNo(), date: '', indentBy: '', oaNo: '', items: [] }); setItemInput({ model: '', itemCode: '', qty: 0, indentClosed: false }); setEditIdx(null); }}>Clear</button>
                </div>
              </div>
            )}

            {newIndent.items.length === 0 && (
              <div style={{ marginTop: 16 }}>
                <button className="im-btn" style={{ ...S.btnSuccess, opacity: 0.4, cursor: 'not-allowed' }} disabled>✓ Save Indent</button>
              </div>
            )}
          </div>

          {/* Indent Records Table */}
          <div style={S.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: S.textPrimary }}>Indent Records</h2>
                <span style={{ fontSize: 12, fontWeight: 600, color: S.textSecondary, background: S.bg, padding: '2px 10px', borderRadius: 20, border: `1px solid ${S.border}` }}>
                  {filteredRows.length} of {indentAnalysisRows.length} rows
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="im-btn im-ghost"
                  style={{ ...S.btnGhost, borderColor: showFilters ? S.accent : S.border, color: showFilters ? S.accent : S.textSecondary, position: 'relative' }}
                  onClick={() => setShowFilters(f => !f)}>
                  ⚙ Filters
                  {activeFilterCount > 0 && (
                    <span style={{ position: 'absolute', top: -6, right: -6, background: S.accent, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterCount}</span>
                  )}
                </button>
                <button className="im-btn im-ghost" style={S.btnGhost} onClick={exportToCSV}>↓ CSV</button>
              </div>
            </div>

            {showFilters && (
              <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <Field label="Search">
                  <input className="im-input" style={{ ...S.input, minWidth: 220 }} placeholder="Item, code, indent no, OA…" value={filterText} onChange={e => setFilterText(e.target.value)} />
                </Field>
                <Field label="Status">
                  <select className="im-input" style={{ ...S.input, width: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
                    <option value="ALL">All</option>
                    <option value="OPEN">Open</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </Field>
                <Field label="Date From">
                  <input type="date" className="im-input" style={{ ...S.input, width: 150 }} value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                </Field>
                <Field label="Date To">
                  <input type="date" className="im-input" style={{ ...S.input, width: 150 }} value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                </Field>
                {activeFilterCount > 0 && (
                  <button className="im-btn im-ghost" style={{ ...S.btnGhost, alignSelf: 'flex-end', color: S.danger, borderColor: '#FECACA' }}
                    onClick={() => { setFilterText(''); setFilterStatus('ALL'); setFilterDateFrom(''); setFilterDateTo(''); }}>✕ Clear all</button>
                )}
              </div>
            )}

            <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${S.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, minWidth: 95 }}>Date</th>
                    <th style={{ ...S.th, minWidth: 115 }}>Indent No</th>
                    <th style={{ ...S.th, minWidth: 180 }}>Item Name</th>
                    <th style={{ ...S.th, minWidth: 110 }}>Item Code</th>
                    <th style={{ ...S.thRight, minWidth: 55 }}>Qty</th>
                    <th style={{ ...S.th, minWidth: 52 }}>By</th>
                    <th style={{ ...S.th, minWidth: 90 }}>OA No</th>
                    <th style={{ width: 2, padding: 0, background: S.borderStrong, borderBottom: `2px solid ${S.borderStrong}` }} />
                    <th style={{ ...S.thRight, minWidth: 95 }}>Total Stock</th>
                    <th style={{ ...S.thRight, minWidth: 80 }}>Prev Qty</th>
                    <th style={{ ...S.thRight, minWidth: 68 }}>PO Qty</th>
                    <th style={{ width: 2, padding: 0, background: S.borderStrong, borderBottom: `2px solid ${S.borderStrong}` }} />
                    <th style={{ ...S.thRight, minWidth: 95 }}>Available</th>
                    <th style={{ ...S.th, textAlign: 'center', minWidth: 94 }}>Status</th>
                    <th style={{ ...S.th, textAlign: 'center', minWidth: 48 }}>Del</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={15} style={{ padding: '40px 0', textAlign: 'center', color: S.textMuted, fontSize: 14 }}>
                        {indentAnalysisRows.length === 0 ? 'No indent records yet. Create your first indent above.' : 'No rows match the current filters.'}
                      </td>
                    </tr>
                  ) : filteredRows.map((r, rowIdx) => {
                    const availBadgeColor = r.availableForThisIndent >= 0 ? S.success : S.danger;
                    const availBg = r.availableForThisIndent >= 0 ? S.successLight : S.dangerLight;
                    const origIndentIndex = indents.findIndex(i => i.indentNo === r.indentNo);
                    const origItemIndex = origIndentIndex >= 0
                      ? indents[origIndentIndex].items.findIndex(i => i.itemCode === r.itemCode && i.model === r.model && i.qty === r.qty)
                      : -1;

                    return (
                      <tr key={rowIdx} className="im-row" style={{ background: rowIdx % 2 === 1 ? S.bg : S.surface }}>
                        <td style={S.td}>{r.date}</td>
                        <td style={{ ...S.td, fontWeight: 600, color: S.accent, whiteSpace: 'nowrap' }}>{r.indentNo}</td>
                        <td style={S.tdClip} title={r.model}>{r.model}</td>
                        <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 13 }}>{r.itemCode}</td>
                        <td style={{ ...S.tdRight, fontWeight: 700 }}>{r.qty}</td>
                        <td style={S.td}>{r.indentBy}</td>
                        <td style={S.td}>{r.oaNo}</td>
                        <td style={{ padding: 0, background: S.border, width: 2 }} />
                        <td style={{ ...S.tdRight, color: S.textSecondary }}>{r.totalStock}</td>
                        <td style={{ ...S.tdRight, color: S.textSecondary }}>{r.previousIndentsQty}</td>
                        <td style={{ ...S.tdRight, color: r.poQuantity > 0 ? S.accent : S.textSecondary }}>{r.poQuantity}</td>
                        <td style={{ padding: 0, background: S.border, width: 2 }} />
                        <td style={S.tdRight}>
                          <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 13, background: availBg, color: availBadgeColor, minWidth: 44, textAlign: 'right' }}>
                            {r.availableForThisIndent}
                          </span>
                        </td>
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          <StatusBadge closed={r.isClosed} />
                        </td>
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          <button className="im-btn im-danger-btn" style={{ ...S.btnDanger, padding: '3px 8px' }}
                            onClick={() => {
                              if (origIndentIndex < 0 || origItemIndex < 0) return;
                              const updated = indents
                                .map((ind, idx) => idx !== origIndentIndex ? ind : { ...ind, items: ind.items.filter((_, i) => i !== origItemIndex) })
                                .filter(ind => ind.items.length > 0);
                              setIndents(updated);
                              replaceFirestoreCollection(uid, 'indentData', updated)
                                .then(() => showToast('Item removed', 'success'))
                                .catch(() => showToast('Failed to save changes', 'error'));
                            }}
                            title="Delete this line">✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredRows.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 13, color: S.textMuted, textAlign: 'right' }}>
                Showing {filteredRows.length} of {indentAnalysisRows.length} rows
                {activeFilterCount > 0 && ` — ${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} active`}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
>>>>>>> ea2b60370e32f18454b4b30c524aa7881340b2ee
  );
};

export default IndentModule;