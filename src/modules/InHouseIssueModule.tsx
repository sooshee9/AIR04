<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
=======
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
>>>>>>> ea2b60370e32f18454b4b30c524aa7881340b2ee
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import {
  getItemMaster,
  subscribeInHouseIssues,
  addInHouseIssue,
  updateInHouseIssue,
  deleteInHouseIssue,
  subscribeVSIRRecords,
} from '../utils/firestoreServices';
import { subscribePsirs } from '../utils/psirService';

<<<<<<< HEAD
interface InHouseIssueItem {
  itemName: string;
  itemCode: string;
  transactionType: string;
  batchNo: string;
  issueQty: number;
  reqBy: string;
  inStock: number;
  reqClosed: boolean;
  receivedDate?: string; // FIFO: Track when item was received
}

interface InHouseIssue {
  id?: string;  // Firestore document ID
  reqNo: string;
  reqDate: string;
  indentNo: string;
  oaNo: string;
  poNo: string;
  vendor: string;
  purchaseBatchNo: string;
  vendorBatchNo: string;
  issueNo: string;
  items: InHouseIssueItem[];
}

const reqByOptions = ['HKG', 'NGR', 'MDD'];
const transactionTypeOptions = ['Purchase', 'Vendor', 'Stock'];

function getNextReqNo(issues: InHouseIssue[]) {
  const base = 'Req-No-';
  if (issues.length === 0) return base + '01';
  const lastSerial = Math.max(
    ...issues.map(i => {
      const match = i.reqNo.match(/Req-No-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
  );
  const nextSerial = lastSerial + 1;
  return base + String(nextSerial).padStart(2, '0');
}

function getNextIssueNo(issues: InHouseIssue[]) {
  const base = 'IH-ISS-';
  if (issues.length === 0) return base + '01';
  const lastSerial = Math.max(
    ...issues.map(i => {
      const match = i.issueNo.match(/IH-ISS-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
  );
  const nextSerial = lastSerial + 1;
  return base + String(nextSerial).padStart(2, '0');
}

const InHouseIssueModule: React.FC = () => {
  const [issues, setIssues] = useState<InHouseIssue[]>(() => {
    const saved = localStorage.getItem('inHouseIssueData');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((issue: any) => ({
        ...issue,
        items: Array.isArray(issue.items) ? issue.items : [],
      }));
    } catch {
      return [];
    }
  });

  const [newIssue, setNewIssue] = useState<InHouseIssue>({
    reqNo: getNextReqNo([]),
    reqDate: '',
    indentNo: '',
    oaNo: '',
    poNo: '',
    vendor: '',
    purchaseBatchNo: '',
    vendorBatchNo: '',
    issueNo: getNextIssueNo([]),
    items: [],
  });

  const [itemInput, setItemInput] = useState<InHouseIssueItem>({
    itemName: '',
    itemCode: '',
    transactionType: 'Purchase',
    batchNo: '',
    issueQty: 0,
    reqBy: '',
    inStock: 0,
    reqClosed: false,
    receivedDate: new Date().toISOString().slice(0, 10),
  });
  // Removed unused editIdx state

  const [itemNames, setItemNames] = useState<string[]>([]);
  const [itemMaster, setItemMaster] = useState<{ itemName: string; itemCode: string }[]>([]);
  const [psirBatchNos, setPsirBatchNos] = useState<string[]>([]);
  const [vsirBatchNos, setVsirBatchNos] = useState<string[]>([]);
  const [stockQuantities, setStockQuantities] = useState<string[]>([]);
  const [, setVendors] = useState<string[]>([]);
  const [, setVendorBatchNos] = useState<string[]>([]);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [editIssueIdx, setEditIssueIdx] = useState<number | null>(null);
  const [psirData, setPsirData] = useState<any[]>([]);
  const [vsirData, setVsirData] = useState<any[]>([]);

  // Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      const uid = u ? u.uid : null;
      setUserUid(uid);
      console.log('[InHouseIssueModule] Auth state changed, uid:', uid);
    });
    return () => unsub();
  }, []);

  // Migrate existing localStorage `inHouseIssueData` into Firestore on sign-in
  useEffect(() => {
    if (!userUid) return;

    (async () => {
      try {
        const raw = localStorage.getItem('inHouseIssueData');
        if (raw) {
          const arr = JSON.parse(raw || '[]');
          if (Array.isArray(arr) && arr.length > 0) {
            console.log('[InHouseIssueModule] Migrating', arr.length, 'issues to Firestore');
            for (const it of arr) {
              try {
                const payload = { ...it } as any;
                if (typeof payload.id !== 'undefined') delete payload.id;
                await addInHouseIssue(userUid, payload);
              } catch (err) {
                console.warn('[InHouseIssueModule] migration add failed for item', it, err);
              }
            }
            try { localStorage.removeItem('inHouseIssueData'); } catch {}
            console.log('[InHouseIssueModule] Migration to Firestore completed');
          }
        }
      } catch (err) {
        console.error('[InHouseIssueModule] Migration failed:', err);
      }

      // Load Item Master from Firestore
      try {
        const items = await getItemMaster(userUid);
        setItemMaster((items || []) as any[]);
        setItemNames((items || []).map((i: any) => i.itemName).filter(Boolean));
        console.log('[InHouseIssueModule] Loaded item master:', items?.length || 0, 'items');
      } catch (err) {
        console.error('[InHouseIssueModule] Failed to load item master:', err);
      }
    })();
  }, [userUid]);

  // Subscribe to Firestore inHouseIssues
  useEffect(() => {
    if (!userUid) return;

    console.log('[InHouseIssueModule] Setting up Firestore subscription for userUid:', userUid);
    const unsub = subscribeInHouseIssues(userUid, (docs) => {
      console.log('[InHouseIssueModule] ✓ Received inHouseIssues from Firestore:', docs.length, 'items');
      setIssues(docs);
    });

    // Subscribe to PSIR data
    const unsubPsir = subscribePsirs(userUid, (docs: any[]) => {
      console.log('[InHouseIssueModule] ✓ Received PSIR data from Firestore:', docs.length, 'items');
      setPsirData(docs || []);
    });

    // Subscribe to VSIR data
    const unsubVsir = subscribeVSIRRecords(userUid, (docs) => {
      console.log('[InHouseIssueModule] ✓ Received VSIR data from Firestore:', docs.length, 'items');
      setVsirData(docs || []);
    });

    return () => {
      unsub();
      unsubPsir();
      unsubVsir();
    };
  }, [userUid]);

  // Helper: Get batch numbers for selected vendor
  const getVendorBatchNos = (vendor: string): string[] => {
    try {
      if (!vendor || !vendor.trim()) {
        return [];
      }
      const purchaseDataRaw = localStorage.getItem('purchaseData');
      if (!purchaseDataRaw) {
        return [];
      }
      const purchaseData = JSON.parse(purchaseDataRaw);
      if (!Array.isArray(purchaseData)) {
        return [];
      }
      const batchNos = new Set<string>();
      purchaseData.forEach((item: any) => {
        if (item.supplierName === vendor && item.vendorBatchNo && item.vendorBatchNo.trim()) {
          batchNos.add(item.vendorBatchNo);
        }
      });
      return Array.from(batchNos).sort();
    } catch (e) {
      console.error('[InHouse] Error getting vendor batch nos:', e);
      return [];
    }
  };

  // Helper: Get batch numbers from VSIR module for an itemCode
  const getVsirBatchNosForItem = (itemCode: string): string[] => {
    try {
      if (!itemCode || !itemCode.trim()) {
        console.log('[InHouse] Empty item code for VSIR, returning empty batch nos');
        return [];
      }
      
      console.log('[InHouse] 🔍 Searching VSIR for item code:', itemCode);
      
      const vsirDataLocal = vsirData;
      console.log('[InHouse] 📊 Loaded VSIR records count:', Array.isArray(vsirDataLocal) ? vsirDataLocal.length : 'not-array');
      
      if (!Array.isArray(vsirDataLocal) || vsirDataLocal.length === 0) {
        console.log('[InHouse] ❌ No VSIR data available');
        return [];
      }
      
      const batchNos = new Set<string>();
      vsirDataLocal.forEach((record: any, idx: number) => {
        console.log(`[InHouse] 📝 Record ${idx}: itemCode=${record.itemCode}, Code=${record.Code}, vendorBatchNo=${record.vendorBatchNo}`);
        // Check if this VSIR record contains the item and has vendorBatchNo
        if ((record.itemCode && record.itemCode === itemCode) || (record.Code && record.Code === itemCode)) {
          if (record.vendorBatchNo && record.vendorBatchNo.trim()) {
            console.log('[InHouse] ✅ Found vendor batch no for item', itemCode, ':', record.vendorBatchNo);
            batchNos.add(record.vendorBatchNo);
          } else {
            console.log('[InHouse] ⚠️  Item matched but vendorBatchNo is empty or missing');
          }
        }
      });
      
      const result = Array.from(batchNos).sort();
      console.log('[InHouse] 📋 Final VSIR batch nos for', itemCode, ':', result, '(count:', result.length, ')');
      return result;
    } catch (e) {
      console.error('[InHouse] ❌ Error getting VSIR batch nos:', e);
      return [];
    }
  };

  // Helper: Get batch numbers from PSIR module for an itemCode
  const getPsirBatchNosForItem = (itemCode: string): string[] => {
    try {
      if (!itemCode || !itemCode.trim()) {
        console.log('[InHouse] Empty item code, returning empty batch nos');
        return [];
      }
      
      const psirDataLocal = psirData;
      if (!Array.isArray(psirDataLocal) || psirDataLocal.length === 0) {
        console.log('[InHouse] No PSIR data available');
        return [];
      }
      
      const batchNos = new Set<string>();
      psirDataLocal.forEach((psir: any) => {
        // Check if this PSIR record contains the item
        const hasItem = Array.isArray(psir.items) && 
          psir.items.some((item: any) => 
            (item.itemCode && item.itemCode === itemCode) || 
            (item.Code && item.Code === itemCode)
          );
        
        // If item found and PSIR has batchNo, add it to the set
        if (hasItem && psir.batchNo && psir.batchNo.trim()) {
          console.log('[InHouse] Found batch no for item', itemCode, ':', psir.batchNo);
          batchNos.add(psir.batchNo);
        }
      });
      
      const result = Array.from(batchNos).sort();
      console.log('[InHouse] All batch nos for', itemCode, ':', result);
      return result;
    } catch (e) {
      console.error('[InHouse] Error getting PSIR batch nos:', e);
      return [];
    }
  };

  // Load item master and vendor data from localStorage on mount (for non-Firestore data)
  useEffect(() => {
    // Fetch Item Names and Codes from Item Master
    const itemMasterRaw = localStorage.getItem('itemMasterData');
    if (itemMasterRaw) {
      try {
        const parsed = JSON.parse(itemMasterRaw);
        if (Array.isArray(parsed)) {
          setItemMaster(parsed);
          setItemNames(parsed.map((item: any) => item.itemName).filter(Boolean));
        }
      } catch {}
    }
    // Fetch Vendors from Purchase data
    const purchaseDataRaw = localStorage.getItem('purchaseData');
    if (purchaseDataRaw) {
      try {
        const parsed = JSON.parse(purchaseDataRaw);
        if (Array.isArray(parsed)) {
          const uniqueVendors = [...new Set(parsed.map((item: any) => item.supplierName).filter(Boolean))];
          setVendors(uniqueVendors);
        }
      } catch {}
    }
  }, []);

  // Update batch numbers when transaction type or item code changes
  useEffect(() => {
    console.log('[InHouse] 🔄 Batch update useEffect triggered. transactionType:', itemInput.transactionType, 'itemCode:', itemInput.itemCode);
    
    if (itemInput.transactionType === 'Purchase' && itemInput.itemCode) {
      const batchNos = getPsirBatchNosForItem(itemInput.itemCode);
      setPsirBatchNos(batchNos);
      setVsirBatchNos([]);
      console.log('[InHouse] ✅ Updated PSIR batch nos for', itemInput.itemCode, ':', batchNos);
    } else if (itemInput.transactionType === 'Vendor' && itemInput.itemCode) {
      console.log('[InHouse] 🎯 Transaction Type is VENDOR - calling getVsirBatchNosForItem');
      const batchNos = getVsirBatchNosForItem(itemInput.itemCode);
      setVsirBatchNos(batchNos);
      setPsirBatchNos([]);
      console.log('[InHouse] ✅ Updated VSIR batch nos for', itemInput.itemCode, ':', batchNos);
    } else if (itemInput.transactionType === 'Stock' && itemInput.itemCode) {
      // For Stock type, get stock quantities
      const stockQtys = getStockQuantities(itemInput.itemCode);
      setStockQuantities(stockQtys);
      setPsirBatchNos([]);
      setVsirBatchNos([]);
      console.log('[InHouse] ✅ Updated Stock quantities for', itemInput.itemCode, ':', stockQtys);
    } else {
      console.log('[InHouse] ⚠️  No batch type matched or missing itemCode');
      setPsirBatchNos([]);
      setVsirBatchNos([]);
    }
  }, [itemInput.transactionType, itemInput.itemCode, psirData, vsirData]);

  // Update vendor batch numbers when vendor selection changes
  useEffect(() => {
    if (newIssue.vendor) {
      const batchNosForVendor = getVendorBatchNos(newIssue.vendor);
      setVendorBatchNos(batchNosForVendor);
    } else {
      setVendorBatchNos([]);
    }
  }, [newIssue.vendor]);

  // Helper: Get stock quantities for selected item code
  const getStockQuantities = (itemCode: string): string[] => {
    try {
      if (!itemCode || !itemCode.trim()) {
        return [];
      }
      const stockDataRaw = localStorage.getItem('stock-records');
      if (!stockDataRaw) {
        return [];
      }
      const stockData = JSON.parse(stockDataRaw);
      if (!Array.isArray(stockData)) {
        return [];
      }
      const quantities = stockData
        .filter((record: any) => record.itemCode === itemCode && record.closingStock > 0)
        .map((record: any) => `${record.closingStock}`);
      return [...new Set(quantities)]; // Remove duplicates
    } catch (e) {
      console.error('Error getting stock quantities:', e);
      return [];
    }
  };

  // Filter stock quantities to show only those not fully issued (for Stock transaction type)
  const getAvailableStockQuantities = (itemCode: string): string[] => {
    try {
      const allStocks = getStockQuantities(itemCode);
      return allStocks.filter(stockQty => {
        const numQty = parseInt(stockQty, 10);
        
        // Check in-house issues
        let totalIssued = 0;
        const issuesRaw = localStorage.getItem('inHouseIssueData');
        if (issuesRaw) {
          const issuesData = JSON.parse(issuesRaw);
          if (Array.isArray(issuesData)) {
            issuesData.forEach((issue: any) => {
              if (Array.isArray(issue.items)) {
                issue.items.forEach((item: any) => {
                  if (item.batchNo === stockQty && item.itemCode === itemCode && item.transactionType === 'Stock') {
                    totalIssued += item.issueQty || 0;
                  }
                });
              }
            });
          }
        }
        
        // Check vendor issues (stock issued through vendor)
        const vendorIssuesRaw = localStorage.getItem('vendorIssueData');
        if (vendorIssuesRaw) {
          const vendorIssuesData = JSON.parse(vendorIssuesRaw);
          if (Array.isArray(vendorIssuesData)) {
            vendorIssuesData.forEach((issue: any) => {
              if (Array.isArray(issue.items)) {
                issue.items.forEach((item: any) => {
                  // For vendor issues, check if batch matches stock qty and item code
                  if (issue.batchNo === stockQty && item.itemCode === itemCode) {
                    totalIssued += item.qty || 0;
                  }
                });
              }
            });
          }
        }
        
        const pending = numQty - totalIssued;
        console.log('[DEBUG] Stock qty filter:', { stockQty, itemCode, pending, willShow: pending > 0 });
        return pending > 0;
      });
    } catch (e) {
      console.error('Error filtering stock quantities:', e);
      return getStockQuantities(itemCode);
    }
  };

  // Update stock quantities when item code or transaction type changes
  useEffect(() => {
    if (itemInput.transactionType === 'Stock' && itemInput.itemCode) {
      const quantities = getAvailableStockQuantities(itemInput.itemCode);
      setStockQuantities(quantities);
    } else {
      setStockQuantities([]);
    }
  }, [itemInput.transactionType, itemInput.itemCode]);

  // Auto-fill Indent No, OA No, PO No from PSIR or VSIR based on batch number
  useEffect(() => {
    if (!itemInput.batchNo) {
      console.log('[InHouse] No batch number selected');
      return;
    }

    console.log('[InHouse] Auto-fill triggered with batchNo:', itemInput.batchNo, 'transactionType:', itemInput.transactionType);

    try {
      if (itemInput.transactionType === 'Purchase') {
        // Get from PSIR
        const psirDataLocal = psirData;
        console.log('[InHouse] PSIR Data loaded:', psirDataLocal);
        if (!Array.isArray(psirDataLocal) || psirDataLocal.length === 0) {
          console.log('[InHouse] No PSIR data available');
          return;
        }
        
        console.log('[InHouse] Searching through', psirDataLocal.length, 'PSIR records');
        for (let i = 0; i < psirDataLocal.length; i++) {
          const psir = psirDataLocal[i];
          console.log(`[InHouse] Record ${i}: batchNo="${psir.batchNo}" (looking for "${itemInput.batchNo}")`);
          
          if (psir.batchNo && psir.batchNo.toString().trim() === itemInput.batchNo.toString().trim()) {
            console.log('[InHouse] ✓ MATCH FOUND!');
            const indentNo = psir.indentNo || '';
            const oaNo = psir.oaNo || '';
            const poNo = psir.poNo || '';
            console.log('[InHouse] Setting values:', { indentNo, oaNo, poNo });
            setNewIssue(prev => {
              const updated = { ...prev, indentNo, oaNo, poNo };
              console.log('[InHouse] Updated newIssue:', updated);
              return updated;
            });
            return;
          }
        }
        console.log('[InHouse] ✗ No matching PSIR batch found');
      } else if (itemInput.transactionType === 'Vendor') {
        // Get from VSIR
        const vsirDataLocal = vsirData;
        console.log('[InHouse] VSIR Data loaded:', vsirDataLocal);
        if (!Array.isArray(vsirDataLocal) || vsirDataLocal.length === 0) {
          console.log('[InHouse] No VSIR data available');
          return;
        }
        
        console.log('[InHouse] Searching through', vsirDataLocal.length, 'VSIR records');
        for (let i = 0; i < vsirDataLocal.length; i++) {
          const vsir = vsirDataLocal[i];
          console.log(`[InHouse] Record ${i}: vendorBatchNo="${vsir.vendorBatchNo}" (looking for "${itemInput.batchNo}")`);
          
          if (vsir.vendorBatchNo && vsir.vendorBatchNo.toString().trim() === itemInput.batchNo.toString().trim()) {
            console.log('[InHouse] ✓ MATCH FOUND!');
            const indentNo = vsir.indentNo || '';
            const oaNo = vsir.oaNo || '';
            const poNo = vsir.poNo || '';
            console.log('[InHouse] Setting values:', { indentNo, oaNo, poNo });
            setNewIssue(prev => {
              const updated = { ...prev, indentNo, oaNo, poNo };
              console.log('[InHouse] Updated newIssue:', updated);
              return updated;
            });
            return;
          }
        }
        console.log('[InHouse] ✗ No matching VSIR batch found');
      }
    } catch (e) {
      console.error('Error auto-filling batch details:', e);
    }
  }, [itemInput.batchNo, itemInput.transactionType, psirData, vsirData]);

  // Auto-fill Indent No, OA No, PO No for all saved issues based on their items' batch numbers
  useEffect(() => {
    if (issues.length === 0) return;

    try {
      console.log('[InHouse] Auto-filling batch details for all saved issues');
      let updated = false;
      const psirDataRaw = localStorage.getItem('psirData');
      const vsirDataRaw = localStorage.getItem('vsri-records');
      
      const psirData = psirDataRaw ? JSON.parse(psirDataRaw) : [];
      const vsirData = vsirDataRaw ? JSON.parse(vsirDataRaw) : [];

      const updatedIssues = issues.map(issue => {
        // If already has all required fields, skip
        if (issue.indentNo && issue.oaNo && issue.poNo) {
          return issue;
        }

        // Try to find matching batch from first item
        if (issue.items && issue.items.length > 0) {
          const firstItem = issue.items[0];
          let indentNo = issue.indentNo || '';
          let oaNo = issue.oaNo || '';
          let poNo = issue.poNo || '';

          if (firstItem.transactionType === 'Purchase') {
            // Search PSIR
            for (const psir of psirData) {
              if (psir.batchNo === firstItem.batchNo) {
                indentNo = psir.indentNo || indentNo;
                oaNo = psir.oaNo || oaNo;
                poNo = psir.poNo || poNo;
                console.log('[InHouse] Found PSIR match for batch:', firstItem.batchNo);
                updated = true;
                break;
              }
            }
          } else if (firstItem.transactionType === 'Vendor') {
            // Search VSIR
            for (const vsir of vsirData) {
              if (vsir.vendorBatchNo === firstItem.batchNo) {
                indentNo = vsir.indentNo || indentNo;
                oaNo = vsir.oaNo || oaNo;
                poNo = vsir.poNo || poNo;
                console.log('[InHouse] Found VSIR match for batch:', firstItem.batchNo);
                updated = true;
                break;
              }
            }
          }

          if (updated) {
            return { ...issue, indentNo, oaNo, poNo };
          }
        }
        return issue;
      });

      if (updated) {
        console.log('[InHouse] Updating issues with auto-filled batch details');
        setIssues(updatedIssues);
        localStorage.setItem('inHouseIssueData', JSON.stringify(updatedIssues));
      }
    } catch (e) {
      console.error('[InHouse] Error auto-filling batch details for saved issues:', e);
    }
  }, []);

  // Auto-add an In House Issue for every new PO in purchaseData if not already present, and fill items from purchase module
  useEffect(() => {
    const purchaseDataRaw = localStorage.getItem('purchaseData');
    let purchaseData = [];
    try {
      purchaseData = purchaseDataRaw ? JSON.parse(purchaseDataRaw) : [];
    } catch {}
    const purchasePOs = purchaseData.map((order: any) => order.poNo).filter(Boolean);
    const existingPOs = new Set(issues.map(issue => issue.poNo));
    let added = false;
    const newIssues = [...issues];
    purchasePOs.forEach((poNo: string) => {
      if (!existingPOs.has(poNo)) {
        const purchaseOrder = purchaseData.find((po: any) => po.poNo === poNo);
        const items = purchaseOrder && Array.isArray(purchaseOrder.items)
          ? purchaseOrder.items.map((item: any) => ({
              itemName: item.itemName || item.model || '',
              itemCode: item.itemCode || '',
              transactionType: 'Purchase',
              batchNo: purchaseOrder?.batchNo || '',
              issueQty: item.qty || 0,
              reqBy: item.reqBy || '',
              inStock: 0,
              reqClosed: false,
            }))
          : [];
        newIssues.push({
          reqNo: '',
          reqDate: '',
          indentNo: '',
          oaNo: '',
          poNo: poNo,
          vendor: purchaseOrder?.supplierName || '',
          purchaseBatchNo: purchaseOrder?.batchNo || '',
          vendorBatchNo: purchaseOrder?.vendorBatchNo || '',
          issueNo: getNextIssueNo(newIssues),
          items,
        });
        added = true;
      }
    });
    if (added) {
      setIssues(newIssues);
      localStorage.setItem('inHouseIssueData', JSON.stringify(newIssues));
    }
    // eslint-disable-next-line
  }, []);

  // When PO No changes, auto-fill Req. No from Vendor Dept DC No if available
  useEffect(() => {
    if (!newIssue.poNo) return;
    const vendorDeptDataRaw = localStorage.getItem('vendorDeptData');
    let vendorDeptData = [];
    try {
      vendorDeptData = vendorDeptDataRaw ? JSON.parse(vendorDeptDataRaw) : [];
    } catch {}
    const match = vendorDeptData.find((order: any) => order.materialPurchasePoNo === newIssue.poNo);
    console.log('[InHouse] vendorDeptData:', vendorDeptData);
    console.log('[InHouse] Selected PO No:', newIssue.poNo);
    console.log('[InHouse] Matched VendorDept order:', match);
    if (match && match.dcNo && newIssue.reqNo !== match.dcNo) {
      console.log('[InHouse] Setting Req. No from VendorDept DC No:', match.dcNo);
      setNewIssue((prev) => {
        const updated = { ...prev, reqNo: match.dcNo };
        console.log('[InHouse] newIssue after Req. No set:', updated);
        return updated;
      });
      return;
    }
    // fallback to purchase module if not found in vendor dept
    const purchaseDataRaw = localStorage.getItem('purchaseData');
    let purchaseData = [];
    try {
      purchaseData = purchaseDataRaw ? JSON.parse(purchaseDataRaw) : [];
    } catch {}
    const matchPurchase = purchaseData.find((order: any) => order.poNo === newIssue.poNo);
    if (matchPurchase && matchPurchase.reqNo && newIssue.reqNo !== matchPurchase.reqNo) {
      console.log('[InHouse] Setting Req. No from Purchase:', matchPurchase.reqNo);
      setNewIssue((prev) => ({ ...prev, reqNo: matchPurchase.reqNo }));
    }
    // eslint-disable-next-line
  }, [newIssue.poNo]);

  // Update vendor batch numbers when vendor selection changes
  useEffect(() => {
    if (newIssue.vendor) {
      const batchNosForVendor = getVendorBatchNos(newIssue.vendor);
      setVendorBatchNos(batchNosForVendor);
    } else {
      setVendorBatchNos([]);
    }
  }, [newIssue.vendor]);

  const handleAddItem = () => {
    if (!itemInput.itemName || !itemInput.itemCode || !itemInput.reqBy || itemInput.issueQty <= 0) return;
    // Sort items by receivedDate (FIFO - oldest first)
    const newItems = [...newIssue.items, itemInput];
    newItems.sort((a, b) => {
      const dateA = new Date(a.receivedDate || '').getTime();
      const dateB = new Date(b.receivedDate || '').getTime();
      return dateA - dateB;
    });
    setNewIssue({ ...newIssue, items: newItems });
    setItemInput({ itemName: '', itemCode: '', transactionType: 'Purchase', batchNo: '', issueQty: 0, reqBy: '', inStock: 0, reqClosed: false, receivedDate: new Date().toISOString().slice(0, 10) });
  };

  const [editItemIdx, setEditItemIdx] = useState<number | null>(null);
  const handleEditItem = (idx: number) => {
    setItemInput(newIssue.items[idx]);
    setEditItemIdx(idx);
  };
  const handleSaveItem = () => {
    if (editItemIdx !== null) {
      setNewIssue(prev => ({
        ...prev,
        items: prev.items.map((item, idx) => idx === editItemIdx ? itemInput : item)
      }));
      setEditItemIdx(null);
      setItemInput({ itemName: '', itemCode: '', transactionType: 'Purchase', batchNo: '', issueQty: 0, reqBy: '', inStock: 0, reqClosed: false });
    } else {
      handleAddItem();
    }
  };

  const handleEditIssue = (idx: number) => {
    setNewIssue(issues[idx]);
    setEditIssueIdx(idx);
  };

  const handleUpdateIssue = () => {
    if (editIssueIdx === null || !userUid) return;
    const issueToUpdate = issues[editIssueIdx];
    if (!issueToUpdate?.id) {
      console.error('[InHouseIssueModule] No issue ID found for update');
      return;
    }
    (async () => {
      try {
        await updateInHouseIssue(userUid, issueToUpdate.id as string, newIssue);
        console.log('[InHouseIssueModule] ✓ Issue updated in Firestore:', issueToUpdate.id);
      } catch (err) {
        console.error('[InHouseIssueModule] Failed to update issue:', err);
      }
    })();
    setNewIssue({ reqNo: getNextReqNo(issues), reqDate: '', indentNo: '', oaNo: '', poNo: '', vendor: '', purchaseBatchNo: '', vendorBatchNo: '', issueNo: getNextIssueNo(issues), items: [] });
    setItemInput({ itemName: '', itemCode: '', transactionType: 'Purchase', batchNo: '', issueQty: 0, reqBy: '', inStock: 0, reqClosed: false, receivedDate: new Date().toISOString().slice(0, 10) });
    setEditIssueIdx(null);
  };

  const handleAddIssue = () => {
    if (!newIssue.reqDate || !newIssue.reqNo || newIssue.items.length === 0) {
      alert('Please fill in: Req. Date, Req. No, and add at least one item');
      return;
    }
    if (!userUid) {
      console.error('[InHouseIssueModule] No userUid available for adding issue');
      alert('Please sign in to add issues');
      return;
    }
    const issueNo = getNextIssueNo(issues);
    (async () => {
      try {
        await addInHouseIssue(userUid, { ...newIssue, issueNo });
        console.log('[InHouseIssueModule] ✓ Issue added to Firestore');
      } catch (err) {
        console.error('[InHouseIssueModule] Failed to add issue:', err);
      }
    })();
    setNewIssue({ reqNo: getNextReqNo(issues), reqDate: '', indentNo: '', oaNo: '', poNo: '', vendor: '', purchaseBatchNo: '', vendorBatchNo: '', issueNo: getNextIssueNo(issues), items: [] });
    setItemInput({ itemName: '', itemCode: '', transactionType: 'Purchase', batchNo: '', issueQty: 0, reqBy: '', inStock: 0, reqClosed: false, receivedDate: new Date().toISOString().slice(0, 10) });
  };

  const handleDeleteItem = async (issueIdx: number, itemIdx: number) => {
    if (!userUid) {
      alert('Please sign in');
      return;
    }
    
    const issueToUpdate = issues[issueIdx];
    if (!issueToUpdate?.id) {
      console.error('[InHouseIssueModule] Issue ID not found');
      return;
    }

    try {
      const updatedItems = issueToUpdate.items.filter((_, i) => i !== itemIdx);
      if (updatedItems.length === 0) {
        // Delete entire issue if no items remain
        await deleteInHouseIssue(userUid, issueToUpdate.id as string);
        console.log('[InHouseIssueModule] ✓ Issue deleted (no items remaining)');
      } else {
        // Update issue with remaining items
        await updateInHouseIssue(userUid, issueToUpdate.id as string, { ...issueToUpdate, items: updatedItems });
        console.log('[InHouseIssueModule] ✓ Item deleted from issue');
      }
    } catch (err) {
      console.error('[InHouseIssueModule] Failed to delete item:', err);
      alert('Failed to delete item: ' + String(err));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'itemName') {
      const found = itemMaster.find(item => item.itemName === value);
      setItemInput({ ...itemInput, itemName: value, itemCode: found ? found.itemCode : '' });
    } else if (name in itemInput) {
      setItemInput({ ...itemInput, [name]: value });
    } else {
      setNewIssue({ ...newIssue, [name]: value });
    }
  };

  // Get batch details (OK Qty and Reject Qty) based on selected batch
  // Calculate already issued qty for a batch number
  const getIssuedQtyForBatch = (batchNo: string, transactionType: string, itemCode: string): number => {
    void transactionType;
    try {
      let totalIssued = 0;
      
      // Check in-house issue data
      const issuesRaw = localStorage.getItem('inHouseIssueData');
      if (issuesRaw) {
        const issuesData = JSON.parse(issuesRaw);
        if (Array.isArray(issuesData)) {
          issuesData.forEach((issue: any) => {
            if (Array.isArray(issue.items)) {
              issue.items.forEach((item: any) => {
                // Sum ALL issued quantities for this batch and itemCode
                if (item.batchNo === batchNo && item.itemCode === itemCode) {
                  totalIssued += item.issueQty || 0;
                }
              });
            }
          });
        }
      }
      
      // Also check vendor issue data - items issued through Vendor Issues module
      const vendorIssuesRaw = localStorage.getItem('vendorIssueData');
      if (vendorIssuesRaw) {
        const vendorIssuesData = JSON.parse(vendorIssuesRaw);
        console.log('[DEBUG] Vendor Issues Data (Full):', vendorIssuesData);
        if (Array.isArray(vendorIssuesData)) {
          vendorIssuesData.forEach((issue: any, issueIdx: number) => {
            console.log(`[DEBUG] Processing vendor issue ${issueIdx}:`, { 
              issueBatchNo: issue.batchNo,
              items: issue.items 
            });
            if (Array.isArray(issue.items)) {
              issue.items.forEach((item: any, itemIdx: number) => {
                console.log(`[DEBUG] Processing vendor item ${issueIdx}-${itemIdx}:`, { 
                  fullItem: item,
                  issueBatchNo: issue.batchNo,
                  searchBatchNo: batchNo, 
                  batchMatch: issue.batchNo === batchNo,
                  itemCode: item.itemCode,
                  searchItemCode: itemCode,
                  codeMatch: item.itemCode === itemCode,
                  qty: item.qty
                });
                // Match by ISSUE batch number (not item.batchNo) and item code
                if (issue.batchNo === batchNo && item.itemCode === itemCode) {
                  console.log('[DEBUG] ✓✓✓ Found vendor issued item:', { batchNo, itemCode, qty: item.qty });
                  totalIssued += item.qty || 0;
                }
              });
            } else {
              console.log(`[DEBUG] Vendor issue ${issueIdx} has no items array or items is not array`);
            }
          });
        }
      }
      
      console.log('[DEBUG] getIssuedQtyForBatch result:', { batchNo, itemCode, totalIssued });
      return totalIssued;
    } catch (e) {
      console.error('Error calculating issued qty for batch:', e);
      return 0;
    }
  };

  // Get OK Qty for a batch from PSIR
  const getPsirOkQtyForBatch = (batchNo: string, itemCode: string): number => {
    try {
      const psirDataLocal = psirData;
      if (!Array.isArray(psirDataLocal)) return 0;
      
      for (const psir of psirDataLocal) {
        if (psir.batchNo === batchNo && Array.isArray(psir.items)) {
          const item = psir.items.find((it: any) => it.itemCode === itemCode);
          if (item) {
            return item.okQty || 0;
          }
        }
      }
      return 0;
    } catch (e) {
      console.error('Error getting PSIR OK Qty:', e);
      return 0;
    }
  };

  // Get OK Qty for a batch from VSIR
  const getVsirOkQtyForBatch = (batchNo: string, itemCode: string): number => {
    try {
      const vsirDataLocal = vsirData;
      if (!Array.isArray(vsirDataLocal)) return 0;
      
      for (const vsir of vsirDataLocal) {
        if (vsir.vendorBatchNo === batchNo && vsir.itemCode === itemCode) {
          return vsir.okQty || 0;
        }
      }
      return 0;
    } catch (e) {
      console.error('Error getting VSIR OK Qty:', e);
      return 0;
    }
  };

  // Get pending OK Qty for a batch (OK Qty - Already Issued)
  const getPendingOkQtyForBatch = (batchNo: string, transactionType: string, itemCode: string): number => {
    let totalOkQty = 0;
    
    if (transactionType === 'Purchase') {
      totalOkQty = getPsirOkQtyForBatch(batchNo, itemCode);
    } else if (transactionType === 'Vendor') {
      totalOkQty = getVsirOkQtyForBatch(batchNo, itemCode);
    }
    
    const issuedQty = getIssuedQtyForBatch(batchNo, transactionType, itemCode);
    const pending = Math.max(0, totalOkQty - issuedQty);
    
    console.log('[DEBUG] getPendingOkQtyForBatch:', { batchNo, transactionType, itemCode, totalOkQty, issuedQty, pending });
    return pending;
  };

  // Filter batch numbers to show only those with pending OK Qty
  const getPsirBatchNosWithPending = (itemCode: string): string[] => {
    const allBatches = getPsirBatchNosForItem(itemCode);
    return allBatches.filter(batch => {
      const pendingQty = getPendingOkQtyForBatch(batch, 'Purchase', itemCode);
      return pendingQty > 0;
    });
  };

  // Filter batch numbers to show only those with pending OK Qty
  const getVsirBatchNosWithPending = (itemCode: string): string[] => {
    const allBatches = getVsirBatchNosForItem(itemCode);
    return allBatches.filter(batch => {
      const pendingQty = getPendingOkQtyForBatch(batch, 'Vendor', itemCode);
      return pendingQty > 0;
    });
  };

  // Get batch details (OK Qty and Reject Qty) based on selected batch
  const getBatchDetailsText = (): string => {
    if (!itemInput.batchNo) {
      return '';
    }

    try {
      if (itemInput.transactionType === 'Purchase') {
        const totalOkQty = getPsirOkQtyForBatch(itemInput.batchNo, itemInput.itemCode);
        const pendingOkQty = getPendingOkQtyForBatch(itemInput.batchNo, 'Purchase', itemInput.itemCode);
        return `${itemInput.batchNo} | OK: ${totalOkQty} | Pending: ${pendingOkQty}`;
      } else if (itemInput.transactionType === 'Vendor') {
        const totalOkQty = getVsirOkQtyForBatch(itemInput.batchNo, itemInput.itemCode);
        const pendingOkQty = getPendingOkQtyForBatch(itemInput.batchNo, 'Vendor', itemInput.itemCode);
        return `${itemInput.batchNo} | OK: ${totalOkQty} | Pending: ${pendingOkQty}`;
      } else if (itemInput.transactionType === 'Stock') {
        // Get from Stock Module
        const stockDataRaw = localStorage.getItem('stock-records');
        if (!stockDataRaw) return 'No Stock data';
        
        const stockData = JSON.parse(stockDataRaw);
        if (!Array.isArray(stockData)) return 'Invalid Stock data';
        
        for (const stock of stockData) {
          if (stock.itemCode === itemInput.itemCode && stock.closingStock.toString() === itemInput.batchNo) {
            const qty = stock.closingStock || 0;
            return `Stock Qty: ${qty}`;
          }
        }
        return `No stock details found`;
      }
      return '';
    } catch (e) {
      console.error('Error getting batch details:', e);
      return 'Error fetching details';
    }
  };

  return (
    <div>
      <h2>In House Issue Module</h2>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input type="text" placeholder="Req. No" value={newIssue.reqNo} readOnly style={{ fontWeight: 'bold', background: '#f0f0f0' }} />
        <input type="date" placeholder="Req. Date" value={newIssue.reqDate} onChange={e => setNewIssue({ ...newIssue, reqDate: e.target.value })} />
        <input type="text" placeholder="Indent No" value={newIssue.indentNo} onChange={e => setNewIssue({ ...newIssue, indentNo: e.target.value })} style={{ display: 'none' }} />
        <input type="text" placeholder="OA No" value={newIssue.oaNo} onChange={e => setNewIssue({ ...newIssue, oaNo: e.target.value })} style={{ display: 'none' }} />
        <input placeholder="PO No" value={newIssue.poNo} onChange={e => setNewIssue({ ...newIssue, poNo: e.target.value })} style={{ display: 'none' }} />
        <input type="text" placeholder="Purchase Batch No" value={newIssue.purchaseBatchNo} onChange={e => setNewIssue({ ...newIssue, purchaseBatchNo: e.target.value })} style={{ display: 'none' }} />
        <input placeholder="Issue No" value={newIssue.issueNo} disabled style={{ background: '#eee', display: 'none' }} />
      </div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label>Item Name:</label>
        {itemNames.length > 0 ? (
          <select
            name="itemName"
            value={itemInput.itemName}
            onChange={handleChange}
          >
            <option value="">Select Item Name</option>
            {itemNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            name="itemName"
            value={itemInput.itemName}
            onChange={handleChange}
          />
        )}
        <input placeholder="Item Code" value={itemInput.itemCode} onChange={e => setItemInput({ ...itemInput, itemCode: e.target.value })} />
        <label>Transaction Type:</label>
        <select value={itemInput.transactionType} onChange={e => setItemInput({ ...itemInput, transactionType: e.target.value })}>
          <option value="">Select</option>
          {transactionTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <label>Batch No:</label>
        <select value={itemInput.batchNo} onChange={e => setItemInput({ ...itemInput, batchNo: e.target.value })}>
          <option value="">Select</option>
          {itemInput.transactionType === 'Purchase' ? (
            psirBatchNos && psirBatchNos.length > 0 ? (
              getPsirBatchNosWithPending(itemInput.itemCode).map(batchNo => {
                const pendingQty = getPendingOkQtyForBatch(batchNo, 'Purchase', itemInput.itemCode);
                return (
                  <option key={batchNo} value={batchNo}>
                    {batchNo} (Pending: {pendingQty})
                  </option>
                );
              })
            ) : (
              <option disabled style={{ color: '#999' }}>No batch numbers available</option>
            )
          ) : itemInput.transactionType === 'Vendor' ? (
            vsirBatchNos && vsirBatchNos.length > 0 ? (
              getVsirBatchNosWithPending(itemInput.itemCode).map(batchNo => {
                const pendingQty = getPendingOkQtyForBatch(batchNo, 'Vendor', itemInput.itemCode);
                return (
                  <option key={batchNo} value={batchNo}>
                    {batchNo} (Pending: {pendingQty})
                  </option>
                );
              })
            ) : (
              <option disabled style={{ color: '#999' }}>No vendor batch numbers available</option>
            )
          ) : itemInput.transactionType === 'Stock' ? (
            stockQuantities && stockQuantities.length > 0 ? (
              stockQuantities.map(qty => (
                <option key={qty} value={qty}>Stock Quantity: {qty}</option>
              ))
            ) : (
              <option disabled style={{ color: '#999' }}>No stock quantities available</option>
            )
          ) : (
            <option disabled style={{ color: '#999' }}>Select Transaction Type first</option>
          )}
        </select>
        <select value={itemInput.reqBy} onChange={e => setItemInput({ ...itemInput, reqBy: e.target.value })}>
          <option value="">Req By</option>
          {reqByOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <input type="number" placeholder="In Stock" value={itemInput.inStock || ''} onChange={e => setItemInput({ ...itemInput, inStock: Number(e.target.value) })} style={{ display: 'none' }} />
        <input type="date" placeholder="Received Date (FIFO)" value={itemInput.receivedDate || ''} onChange={e => setItemInput({ ...itemInput, receivedDate: e.target.value })} title="Date when item was received - used for FIFO" style={{ display: 'none' }} />
        <input type="number" placeholder="Issue Qty" value={itemInput.issueQty || ''} onChange={e => setItemInput({ ...itemInput, issueQty: Number(e.target.value) })} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <label style={{ fontWeight: 'bold', minWidth: '80px' }}>Batch Details:</label>
          <input
            type="text"
            placeholder="Batch No | OK Qty"
            value={getBatchDetailsText()}
            readOnly
            style={{
              background: '#f5f5f5',
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #ddd',
              minWidth: '250px',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}
          />
        </div>
        <label style={{ display: 'none' }}>
          <input type="checkbox" checked={itemInput.reqClosed} onChange={e => setItemInput({ ...itemInput, reqClosed: e.target.checked })} />
          Req Closed
        </label>
  <button onClick={handleSaveItem}>{editItemIdx !== null ? 'Save' : 'Add Item'}</button>
      </div>
      {newIssue.items.length > 0 && (
        <table border={1} cellPadding={6} style={{ width: '100%', marginBottom: 16 }}>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Item Code</th>
              <th>Transaction Type</th>
              <th>Batch No</th>
              <th>Req By</th>
              <th>In Stock</th>
              <th>Received Date (FIFO)</th>
              <th>Issue Qty</th>
              <th>Req Closed</th>
            </tr>
          </thead>
          <tbody>
            {newIssue.items.map((item, idx) => (
              <tr key={idx}>
                <td>{item.itemName}</td>
                <td>{item.itemCode}</td>
                <td>{item.transactionType}</td>
                <td>{item.batchNo}</td>
                <td>{item.reqBy}</td>
                <td>{item.inStock}</td>
                <td>{item.receivedDate}</td>
                <td>{item.issueQty}</td>
                <td>{item.reqClosed ? 'Yes' : 'No'}</td>
                <td><button style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }} onClick={() => handleEditItem(idx)}>Edit</button></td>
                <td><button onClick={(e) => {
                  e.preventDefault();
                  const toDelete = issues[idx];
                  if (!toDelete?.id || !userUid) return;
                  (async () => {
                    try {
                      await deleteInHouseIssue(userUid, toDelete.id as string);
                      console.log('[InHouseIssueModule] ✓ Issue deleted from Firestore:', toDelete.id);
                    } catch (err) {
                      console.error('[InHouseIssueModule] Failed to delete issue:', err);
                    }
                  })();
                }} style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button 
        onClick={editIssueIdx !== null ? handleUpdateIssue : handleAddIssue} 
        style={{marginBottom: 16}}
        disabled={!userUid}
        title={!userUid ? 'Please sign in to add/update issues' : ''}
      >
        {editIssueIdx !== null ? 'Update In House Issue' : 'Add In House Issue'}
      </button>
      <h3>In House Issues</h3>
      <table border={1} cellPadding={6} style={{ width: '100%', marginBottom: 16 }}>
        <thead>
          <tr>
            <th>Req. No</th>
            <th>Req. Date</th>
            <th>Indent No</th>
            <th>OA No</th>
            <th>PO No</th>
            <th>Issue No</th>
            <th>Item Name</th>
            <th>Item Code</th>
            <th>Transaction Type</th>
            <th>Batch No</th>
            <th>Req By</th>
            <th>In Stock</th>
            <th>Received Date (FIFO)</th>
            <th>Issue Qty</th>
            <th>Req Closed</th>
            <th>Edit</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {issues.flatMap((issue, idx) =>
            issue.items.map((item, i) => (
              <tr key={`${idx}-${i}`}>
                <td>{issue.reqNo}</td>
                <td>{issue.reqDate}</td>
                <td>{issue.indentNo}</td>
                <td>{issue.oaNo}</td>
                <td>{issue.poNo}</td>
                <td>{issue.issueNo}</td>
                <td>{item.itemName}</td>
                <td>{item.itemCode}</td>
                <td>{item.transactionType}</td>
                <td>{item.batchNo}</td>
                <td>{item.reqBy}</td>
                <td>{item.inStock}</td>
                <td>{item.receivedDate}</td>
                <td>{item.issueQty}</td>
                <td>{item.reqClosed ? 'Yes' : 'No'}</td>
                <td><button style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }} onClick={() => handleEditIssue(idx)}>Edit</button></td>
                <td><button onClick={() => handleDeleteItem(idx, i)} style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>Delete</button></td>
              </tr>
            ))
         )}
        </tbody>
      </table>

      {/* DEBUG PANEL */}
      <div style={{ marginTop: 40, borderTop: '2px solid #ddd', paddingTop: 20 }}>
        <button 
          onClick={() => setDebugPanelOpen(!debugPanelOpen)}
          style={{ 
            background: '#ff9800', 
            color: 'white', 
            padding: '10px 20px', 
            border: 'none', 
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 'bold'
          }}
        >
          {debugPanelOpen ? '🐛 Hide DEBUG PANEL' : '🐛 Show DEBUG PANEL'}
        </button>

        {debugPanelOpen && (
          <div style={{ 
            marginTop: 20, 
            background: '#f5f5f5', 
            border: '2px solid #ff9800',
            padding: 20,
            borderRadius: 8,
            fontSize: 12
          }}>
            <h3 style={{ marginTop: 0, color: '#ff6f00' }}>🔧 Debug Panel - Batch Filtering Logic</h3>
            
            <div style={{ marginBottom: 20 }}>
              <strong>📋 Current Selection:</strong>
              <div style={{ background: 'white', padding: 10, marginTop: 5, borderRadius: 4, fontFamily: 'monospace' }}>
                <div>Item Name: <strong>{itemInput.itemName || 'N/A'}</strong></div>
                <div>Item Code: <strong>{itemInput.itemCode || 'N/A'}</strong></div>
                <div>Transaction Type: <strong>{itemInput.transactionType || 'N/A'}</strong></div>
                <div>Selected Batch: <strong>{itemInput.batchNo || 'N/A'}</strong></div>
              </div>
            </div>

            {itemInput.transactionType === 'Purchase' && (
              <div style={{ marginBottom: 20 }}>
                <strong>🏭 PURCHASE Transaction Type - Batch Analysis:</strong>
                <div style={{ background: 'white', padding: 10, marginTop: 5, borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}>
                  <div style={{ marginBottom: 10 }}>
                    <strong>All PSIR Batches Available:</strong>
                    <div style={{ paddingLeft: 10 }}>
                      {psirBatchNos.length > 0 ? (
                        psirBatchNos.map((batch) => {
                          const okQty = getPsirOkQtyForBatch(batch, itemInput.itemCode);
                          const issuedQty = getIssuedQtyForBatch(batch, 'Purchase', itemInput.itemCode);
                          const pendingQty = getPendingOkQtyForBatch(batch, 'Purchase', itemInput.itemCode);
                          const willShow = pendingQty > 0;
                          
                          return (
                            <div key={batch} style={{ 
                              padding: 8, 
                              margin: 5, 
                              background: willShow ? '#e8f5e9' : '#ffebee',
                              borderLeft: `3px solid ${willShow ? '#4caf50' : '#f44336'}`,
                              borderRadius: 3
                            }}>
                              <div><strong>{batch}</strong> {willShow ? '✅' : '❌'}</div>
                              <div>  OK Qty: {okQty} | Issued: {issuedQty} | Pending: {pendingQty}</div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ color: '#999' }}>No PSIR batches found</div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 15, paddingTop: 10, borderTop: '1px solid #ddd' }}>
                    <strong>Dropdown will show:</strong>
                    <div style={{ paddingLeft: 10, color: '#2196f3' }}>
                      {getPsirBatchNosWithPending(itemInput.itemCode).length > 0 ? (
                        getPsirBatchNosWithPending(itemInput.itemCode).map(b => (
                          <div key={b}>✓ {b} (Pending: {getPendingOkQtyForBatch(b, 'Purchase', itemInput.itemCode)})</div>
                        ))
                      ) : (
                        <div style={{ color: '#f44336' }}>❌ No batches (all fully issued)</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {itemInput.transactionType === 'Vendor' && (
              <div style={{ marginBottom: 20 }}>
                <strong>🏪 VENDOR Transaction Type - Batch Analysis:</strong>
                <div style={{ background: 'white', padding: 10, marginTop: 5, borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}>
                  <div style={{ marginBottom: 10 }}>
                    <strong>All VSIR Batches Available:</strong>
                    <div style={{ paddingLeft: 10 }}>
                      {vsirBatchNos.length > 0 ? (
                        vsirBatchNos.map((batch) => {
                          const okQty = getVsirOkQtyForBatch(batch, itemInput.itemCode);
                          const issuedQty = getIssuedQtyForBatch(batch, 'Vendor', itemInput.itemCode);
                          const pendingQty = getPendingOkQtyForBatch(batch, 'Vendor', itemInput.itemCode);
                          const willShow = pendingQty > 0;
                          
                          return (
                            <div key={batch} style={{ 
                              padding: 8, 
                              margin: 5, 
                              background: willShow ? '#e8f5e9' : '#ffebee',
                              borderLeft: `3px solid ${willShow ? '#4caf50' : '#f44336'}`,
                              borderRadius: 3
                            }}>
                              <div><strong>{batch}</strong> {willShow ? '✅' : '❌'}</div>
                              <div>  OK Qty: {okQty} | Issued: {issuedQty} | Pending: {pendingQty}</div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ color: '#999' }}>No VSIR batches found</div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 15, paddingTop: 10, borderTop: '1px solid #ddd' }}>
                    <strong>Dropdown will show:</strong>
                    <div style={{ paddingLeft: 10, color: '#2196f3' }}>
                      {getVsirBatchNosWithPending(itemInput.itemCode).length > 0 ? (
                        getVsirBatchNosWithPending(itemInput.itemCode).map(b => (
                          <div key={b}>✓ {b} (Pending: {getPendingOkQtyForBatch(b, 'Vendor', itemInput.itemCode)})</div>
                        ))
                      ) : (
                        <div style={{ color: '#f44336' }}>❌ No batches (all fully issued)</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {itemInput.transactionType === 'Stock' && (
              <div style={{ marginBottom: 20 }}>
                <strong>📦 STOCK Transaction Type - Quantity Analysis:</strong>
                <div style={{ background: 'white', padding: 10, marginTop: 5, borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}>
                  <div style={{ marginBottom: 10 }}>
                    <strong>All Stock Quantities Available:</strong>
                    <div style={{ paddingLeft: 10 }}>
                      {stockQuantities.length > 0 ? (
                        getStockQuantities(itemInput.itemCode).map((qty) => {
                          let totalIssued = 0;
                          
                          // Check in-house issues
                          const issuesRaw = localStorage.getItem('inHouseIssueData');
                          if (issuesRaw) {
                            const issuesData = JSON.parse(issuesRaw);
                            if (Array.isArray(issuesData)) {
                              issuesData.forEach((issue: any) => {
                                if (Array.isArray(issue.items)) {
                                  issue.items.forEach((item: any) => {
                                    if (item.batchNo === qty && item.itemCode === itemInput.itemCode && item.transactionType === 'Stock') {
                                      totalIssued += item.issueQty || 0;
                                    }
                                  });
                                }
                              });
                            }
                          }
                          
                          // Check vendor issues
                          const vendorIssuesRaw = localStorage.getItem('vendorIssueData');
                          if (vendorIssuesRaw) {
                            const vendorIssuesData = JSON.parse(vendorIssuesRaw);
                            if (Array.isArray(vendorIssuesData)) {
                              vendorIssuesData.forEach((issue: any) => {
                                if (Array.isArray(issue.items)) {
                                  issue.items.forEach((item: any) => {
                                    if (issue.batchNo === qty && item.itemCode === itemInput.itemCode) {
                                      totalIssued += item.qty || 0;
                                    }
                                  });
                                }
                              });
                            }
                          }
                          
                          const numQty = parseInt(qty, 10);
                          const pending = numQty - totalIssued;
                          const willShow = pending > 0;
                          
                          return (
                            <div key={qty} style={{ 
                              padding: 8, 
                              margin: 5, 
                              background: willShow ? '#e8f5e9' : '#ffebee',
                              borderLeft: `3px solid ${willShow ? '#4caf50' : '#f44336'}`,
                              borderRadius: 3
                            }}>
                              <div><strong>Qty: {qty}</strong> {willShow ? '✅' : '❌'}</div>
                              <div>  In-House Issued: {totalIssued} | Pending: {pending}</div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ color: '#999' }}>No stock quantities found</div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 15, paddingTop: 10, borderTop: '1px solid #ddd' }}>
                    <strong>Dropdown will show:</strong>
                    <div style={{ paddingLeft: 10, color: '#2196f3' }}>
                      {getAvailableStockQuantities(itemInput.itemCode).length > 0 ? (
                        getAvailableStockQuantities(itemInput.itemCode).map(qty => (
                          <div key={qty}>✓ Stock Qty: {qty}</div>
                        ))
                      ) : (
                        <div style={{ color: '#f44336' }}>❌ No stock quantities (all fully issued)</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 20, paddingTop: 10, borderTop: '1px solid #ccc', fontSize: 11, color: '#666' }}>
              <strong>📝 Formula:</strong>
              <div>Pending Qty = Available Qty - (In-House Issued + Vendor Issued)</div>
              <div>✅ Show in dropdown if: Pending Qty &gt; 0</div>
              <div>❌ Hide from dropdown if: Pending Qty = 0 (already fully issued)</div>
            </div>
          </div>
        )}
=======
// ─── Types ────────────────────────────────────────────────────────────────────

interface InHouseIssueItem {
  itemName: string; itemCode: string; transactionType: string;
  batchNo: string; issueQty: number; reqBy: string;
  inStock: number; reqClosed: boolean; receivedDate?: string;
}

interface InHouseIssue {
  id?: string; reqNo: string; reqDate: string; indentNo: string;
  oaNo: string; poNo: string; vendor: string; purchaseBatchNo: string;
  vendorBatchNo: string; issueNo: string; items: InHouseIssueItem[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REQ_BY_OPTIONS = ['HKG', 'NGR', 'MDD'];
const TX_TYPE_OPTIONS = ['Purchase', 'Vendor', 'Stock'];

const BLANK_ITEM: InHouseIssueItem = {
  itemName: '', itemCode: '', transactionType: 'Purchase', batchNo: '',
  issueQty: 0, reqBy: '', inStock: 0, reqClosed: false,
  receivedDate: new Date().toISOString().slice(0, 10),
};

// ─── Serial generators ────────────────────────────────────────────────────────

function getNextReqNo(issues: InHouseIssue[]): string {
  if (!issues.length) return 'Req-No-01';
  const max = Math.max(...issues.map(i => { const m = i.reqNo?.match(/Req-No-(\d+)/); return m ? parseInt(m[1], 10) : 0; }));
  return `Req-No-${String(max + 1).padStart(2, '0')}`;
}

function getNextIssueNo(issues: InHouseIssue[]): string {
  if (!issues.length) return 'IH-ISS-01';
  const max = Math.max(...issues.map(i => { const m = i.issueNo?.match(/IH-ISS-(\d+)/); return m ? parseInt(m[1], 10) : 0; }));
  return `IH-ISS-${String(max + 1).padStart(2, '0')}`;
}

function blankIssue(issues: InHouseIssue[]): InHouseIssue {
  return {
    reqNo: getNextReqNo(issues), reqDate: '', indentNo: '', oaNo: '', poNo: '',
    vendor: '', purchaseBatchNo: '', vendorBatchNo: '', issueNo: getNextIssueNo(issues), items: [],
  };
}

// ─── Global CSS (same design language as VendorDeptModule / VendorIssueModule) ─

const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');

.ihm { font-family:'DM Sans',system-ui,sans-serif; color:#111827; background:#f4f5f9; }
.ihm * { box-sizing:border-box; font-family:inherit; }
.ihm-inner { max-width:1480px; margin:0 auto; padding:24px 28px; }

.ihm-input {
  padding:8px 12px; border-radius:8px; border:1.5px solid #e2e4ea;
  font-size:13.5px; width:100%; transition:border-color 0.15s,box-shadow 0.15s;
  background:#fff; color:#111; line-height:1.5;
}
.ihm-input:focus { outline:none; border-color:#1a237e; box-shadow:0 0 0 3px rgba(26,35,126,0.1); }
.ihm-input-ro { background:#f7f8fb !important; color:#8b95a1 !important; cursor:default; }
.ihm-input-accent { border-color:#1a237e !important; font-weight:500; }
.ihm-select {
  -webkit-appearance:none; appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238b95a1' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 10px center; padding-right:34px;
}
.ihm-checkbox { display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; font-weight:500; color:#374151; user-select:none; }
.ihm-checkbox input[type=checkbox] { width:16px; height:16px; accent-color:#1a237e; cursor:pointer; }

.ihm-btn {
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  padding:9px 18px; border-radius:8px; border:none; cursor:pointer;
  font-size:13px; font-weight:600; transition:all 0.15s; white-space:nowrap;
}
.ihm-btn:active { transform:scale(0.97); }
.ihm-btn-sm  { padding:7px 14px; font-size:12.5px; border-radius:7px; }
.ihm-btn-xs  { padding:4px 9px; font-size:11.5px; border-radius:6px; }
.ihm-btn-primary { background:#1a237e; color:#fff; }
.ihm-btn-primary:hover { background:#283593; }
.ihm-btn-success { background:#16a34a; color:#fff; }
.ihm-btn-success:hover { background:#15803d; }
.ihm-btn-danger  { background:#ef4444; color:#fff; }
.ihm-btn-danger:hover  { background:#dc2626; }
.ihm-btn-warning { background:#d97706; color:#fff; }
.ihm-btn-warning:hover { background:#b45309; }
.ihm-btn-ghost { background:#fff; color:#374151; border:1.5px solid #e2e4ea; }
.ihm-btn-ghost:hover { background:#f7f8fb; border-color:#c9cdd8; }
.ihm-btn-indigo { background:#4f46e5; color:#fff; }
.ihm-btn-indigo:hover { background:#4338ca; }

.ihm-card { background:#fff; border-radius:12px; border:1px solid #e2e4ea; box-shadow:0 1px 4px rgba(0,0,0,0.05); overflow:hidden; }
.ihm-card-edit { border:2px solid #1a237e !important; box-shadow:0 0 0 4px rgba(26,35,126,0.07),0 4px 20px rgba(0,0,0,0.08) !important; }

.ihm-lbl { font-size:11px; font-weight:700; color:#8b95a1; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:5px; display:block; }
.ihm-sec { font-size:10.5px; font-weight:800; color:#a5b0be; text-transform:uppercase; letter-spacing:0.1em; display:flex; align-items:center; gap:10px; padding:4px 0 12px; }
.ihm-sec::after { content:''; flex:1; height:1px; background:#edf0f5; }

.ihm-stats { display:flex; align-items:center; }
.ihm-stat { text-align:center; padding:4px 28px; }
.ihm-stat:first-child { padding-left:6px; }
.ihm-stat-val { font-size:30px; font-weight:700; line-height:1; letter-spacing:-0.02em; }
.ihm-stat-lbl { font-size:10.5px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.07em; margin-top:5px; }
.ihm-divider-v { width:1px; background:#e2e4ea; height:46px; flex-shrink:0; }
.ihm-divider-sm { width:1px; height:26px; background:#e2e4ea; }

.ihm-toolbar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.ihm-rowcount { background:#eef2ff; color:#3730a3; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; }

.ihm-fpanel {
  background:#eef2ff; border:1px solid #c7d2fe; border-radius:10px;
  padding:16px 20px; display:flex; align-items:flex-end; gap:14px; flex-wrap:wrap;
  animation:ihmFadeDown 0.18s cubic-bezier(.34,1.56,.64,1);
}
@keyframes ihmFadeDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

.ihm-chip { display:inline-flex; align-items:center; gap:4px; background:#e0e7ff; color:#3730a3; border-radius:20px; padding:4px 11px; font-size:11.5px; font-weight:600; }
.ihm-chip-x { cursor:pointer; opacity:0.5; font-size:14px; line-height:1; margin-left:1px; }
.ihm-chip-x:hover { opacity:1; }

.ihm-refbar { display:flex; align-items:center; gap:12px; flex-wrap:wrap; background:#eef2ff; border:1px solid #c7d2fe; border-radius:10px; padding:14px 18px; margin-bottom:18px; }
.ihm-refbar-meta { font-size:12px; color:#6b7280; display:flex; align-items:center; gap:4px; }
.ihm-refbar-meta strong { color:#111; font-weight:600; }

.ihm-batch-info {
  display:flex; align-items:center; gap:10px;
  background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px;
  padding:8px 14px; font-size:12px; font-family:'JetBrains Mono',monospace;
}
.ihm-batch-info .bi-label { color:#6b7280; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; }
.ihm-batch-info .bi-val { color:#15803d; font-weight:700; font-size:13px; }
.ihm-batch-info .bi-pending { color:#b45309; }

.ihm-itable { width:100%; border-collapse:collapse; font-size:12.5px; }
.ihm-itable th { padding:8px 10px; background:#f4f5f9; color:#5b6474; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #e2e4ea; text-align:left; }
.ihm-itable th.r { text-align:right; }
.ihm-itable td { padding:9px 10px; border-bottom:1px solid #f0f1f5; vertical-align:middle; }
.ihm-itable td.r { text-align:right; font-variant-numeric:tabular-nums; }
.ihm-itable tr:last-child td { border-bottom:none; }
.ihm-itable tr:hover td { background:#f9faff; }

.ihm-table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:12.5px; }
.ihm-table th { padding:11px 10px; font-size:10.5px; font-weight:700; color:#1a237e; text-transform:uppercase; letter-spacing:0.05em; background:#eef2ff; border-bottom:2px solid #c7d2fe; text-align:left; white-space:nowrap; }
.ihm-table th.r { text-align:right; }
.ihm-table th.div-l { border-left:2px solid #c7d2fe; }
.ihm-table td { padding:10px 10px; border-bottom:1px solid #f0f1f5; vertical-align:middle; }
.ihm-table td.r { text-align:right; font-variant-numeric:tabular-nums; }
.ihm-table td.div-l { border-left:2px solid #eef2ff; }
.ihm-table tr:nth-child(even) td { background:#fafbff; }
.ihm-table tr:hover td { background:#f5f7ff !important; transition:background 0.1s; }

.ellipsis { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block; }
.mono { font-family:'JetBrains Mono',monospace; font-size:11.5px; }

.badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
.badge-purchase { background:#e0e7ff; color:#3730a3; }
.badge-vendor   { background:#fef3c7; color:#b45309; }
.badge-stock    { background:#f0fdf4; color:#15803d; }
.badge-other    { background:#f3f4f6; color:#6b7280; }
.badge-closed   { background:#dcfce7; color:#16a34a; }
.badge-open     { background:#fee2e2; color:#ef4444; }
.badge-hkg { background:#e0e7ff; color:#3730a3; }
.badge-ngr { background:#fef3c7; color:#b45309; }
.badge-mdd { background:#f0fdf4; color:#15803d; }

.ihm-empty { padding:52px; text-align:center; color:#9ca3af; }
.ihm-empty-icon { font-size:36px; margin-bottom:12px; opacity:0.45; }

.ihm-toasts { position:fixed; top:22px; right:22px; z-index:9999; display:flex; flex-direction:column; gap:8px; pointer-events:none; }
.ihm-toast { padding:12px 18px; border-radius:10px; font-size:13px; font-weight:500; max-width:360px; box-shadow:0 4px 20px rgba(0,0,0,0.12); pointer-events:all; animation:toastPop 0.24s cubic-bezier(0.34,1.56,0.64,1) both; }
@keyframes toastPop { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:translateX(0)} }
.toast-s { background:#dcfce7; color:#16a34a; border:1px solid #bbf7d0; }
.toast-e { background:#fee2e2; color:#ef4444; border:1px solid #fecaca; }
.toast-i { background:#eef2ff; color:#3730a3; border:1px solid #c7d2fe; }

input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
input[type=number] { -moz-appearance:textfield; }
::-webkit-scrollbar { width:5px; height:5px; }
::-webkit-scrollbar-track { background:#f0f1f5; }
::-webkit-scrollbar-thumb { background:#c7d2fe; border-radius:3px; }
`;

// ─── Toast hook ───────────────────────────────────────────────────────────────

let _tid = 0;
interface Toast { id: number; msg: string; type: 's' | 'e' | 'i' }
const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((msg: string, type: Toast['type'] = 'i') => {
    const id = ++_tid;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);
  return { toasts, show };
};

// ─── CSV export ───────────────────────────────────────────────────────────────

const exportCSV = (rows: Array<InHouseIssue & { _item: InHouseIssueItem }>) => {
  const H = ['#','Req No','Req Date','Issue No','Indent No','OA No','PO No','Vendor',
    'Purchase Batch No','Vendor Batch No','Item Name','Item Code','Tx Type',
    'Batch No','Req By','Issue Qty','In Stock','Received Date','Req Closed'];
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [H.map(esc).join(',')];
  rows.forEach((r, i) => lines.push([
    i + 1, r.reqNo, r.reqDate, r.issueNo, r.indentNo, r.oaNo, r.poNo, r.vendor,
    r.purchaseBatchNo, r.vendorBatchNo,
    r._item.itemName, r._item.itemCode, r._item.transactionType,
    r._item.batchNo, r._item.reqBy, r._item.issueQty,
    r._item.inStock, r._item.receivedDate || '', r._item.reqClosed ? 'Yes' : 'No',
  ].map(esc).join(',')));
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `inhouse-issues-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Field: React.FC<{ label: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ label, children, style }) => (
  <div style={style}>
    <span className="ihm-lbl">{label}</span>
    {children}
  </div>
);

const TxBadge: React.FC<{ val: string }> = ({ val }) => {
  const cls = val === 'Purchase' ? 'badge-purchase' : val === 'Vendor' ? 'badge-vendor' : val === 'Stock' ? 'badge-stock' : 'badge-other';
  return <span className={`badge ${cls}`}>{val || '—'}</span>;
};

const ReqByBadge: React.FC<{ val: string }> = ({ val }) => {
  const cls = val === 'HKG' ? 'badge-hkg' : val === 'NGR' ? 'badge-ngr' : val === 'MDD' ? 'badge-mdd' : 'badge-other';
  return <span className={`badge ${cls}`}>{val || '—'}</span>;
};

const ClosedBadge: React.FC<{ closed: boolean }> = ({ closed }) => (
  <span className={`badge ${closed ? 'badge-closed' : 'badge-open'}`}>{closed ? 'Closed' : 'Open'}</span>
);

const NumInput: React.FC<{ value: number; onChange: (n: number) => void; placeholder?: string; style?: React.CSSProperties }> = ({ value, onChange, placeholder, style }) => (
  <input type="number" className="ihm-input" min={0}
    style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', ...style }}
    value={value || ''} placeholder={placeholder || '0'}
    onChange={e => onChange(Math.max(0, Number(e.target.value)))} />
);

// ─── Main component ───────────────────────────────────────────────────────────

const InHouseIssueModule: React.FC = () => {
  const { toasts, show: toast } = useToast();

  // Inject styles once
  useEffect(() => {
    if (document.getElementById('ihm-css')) return;
    const el = document.createElement('style'); el.id = 'ihm-css'; el.textContent = GLOBAL_STYLES;
    document.head.appendChild(el);
  }, []);

  // ── State ──────────────────────────────────────────────────────────────────
  const [userUid, setUserUid] = useState<string | null>(null);
  const [issues, setIssues] = useState<InHouseIssue[]>([]);
  const [psirData, setPsirData] = useState<any[]>([]);
  const [vsirData, setVsirData] = useState<any[]>([]);
  const [itemMaster, setItemMaster] = useState<{ itemName: string; itemCode: string }[]>([]);
  const [itemNames, setItemNames] = useState<string[]>([]);

  const [newIssue, setNewIssue] = useState<InHouseIssue>(() => blankIssue([]));
  const [itemInput, setItemInput] = useState<InHouseIssueItem>({ ...BLANK_ITEM });
  const [editIssueIdx, setEditIssueIdx] = useState<number | null>(null);
  const [editItemIdx, setEditItemIdx] = useState<number | null>(null);

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [fSearch, setFSearch] = useState('');
  const [fTxType, setFTxType] = useState('');
  const [fReqBy, setFReqBy] = useState('');
  const [fClosed, setFClosed] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  const editRef = useRef<HTMLDivElement>(null);

  // ── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => onAuthStateChanged(auth, u => setUserUid(u?.uid ?? null)), []);

  // ── Subscriptions ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userUid) return;
    const unsubs: (() => void)[] = [];
    try { unsubs.push(subscribeInHouseIssues(userUid, docs => setIssues(docs.map(d => ({ ...d, items: Array.isArray(d.items) ? d.items : [] })) as InHouseIssue[]))); } catch {}
    try { unsubs.push(subscribePsirs(userUid, docs => setPsirData(docs || []))); } catch {}
    try { unsubs.push(subscribeVSIRRecords(userUid, docs => setVsirData(docs || []))); } catch {}
    getItemMaster(userUid).then((im: any) => {
      if (Array.isArray(im) && im.length) { setItemMaster(im); setItemNames(im.map((it: any) => it.itemName).filter(Boolean)); }
    }).catch(() => {});
    return () => unsubs.forEach(u => { try { u(); } catch {} });
  }, [userUid]);

  // ── Load item master from localStorage fallback ──────────────────────────
  useEffect(() => {
    if (itemMaster.length) return;
    try {
      const raw = localStorage.getItem('itemMasterData');
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) { setItemMaster(p); setItemNames(p.map((it: any) => it.itemName).filter(Boolean)); } }
    } catch {}
  }, [itemMaster.length]);

  // ─── Batch lookup helpers ─────────────────────────────────────────────────

  const getPsirBatchesForItem = useCallback((itemCode: string): string[] => {
    if (!itemCode) return [];
    const set = new Set<string>();
    psirData.forEach((p: any) => {
      if (Array.isArray(p.items) && p.items.some((it: any) => it.itemCode === itemCode || it.Code === itemCode)) {
        if (p.batchNo?.trim()) set.add(p.batchNo);
      }
    });
    return [...set].sort();
  }, [psirData]);

  const getVsirBatchesForItem = useCallback((itemCode: string): string[] => {
    if (!itemCode) return [];
    const set = new Set<string>();
    vsirData.forEach((r: any) => {
      if ((r.itemCode === itemCode || r.Code === itemCode) && r.vendorBatchNo?.trim()) set.add(r.vendorBatchNo);
    });
    return [...set].sort();
  }, [vsirData]);

  const getStockQtysForItem = useCallback((itemCode: string): string[] => {
    try {
      const raw = localStorage.getItem('stock-records');
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return [...new Set(data.filter((r: any) => r.itemCode === itemCode && r.closingStock > 0).map((r: any) => String(r.closingStock)))];
    } catch { return []; }
  }, []);

  const getPsirOkQty = useCallback((batchNo: string, itemCode: string): number => {
    for (const p of psirData) {
      if (p.batchNo === batchNo && Array.isArray(p.items)) {
        const it = p.items.find((i: any) => i.itemCode === itemCode);
        if (it) return it.okQty || 0;
      }
    }
    return 0;
  }, [psirData]);

  const getVsirOkQty = useCallback((batchNo: string, itemCode: string): number => {
    const r = vsirData.find((v: any) => v.vendorBatchNo === batchNo && v.itemCode === itemCode);
    return r?.okQty || 0;
  }, [vsirData]);

  const getIssuedQty = useCallback((batchNo: string, itemCode: string): number => {
    let total = 0;
    issues.forEach(iss => iss.items.forEach(it => {
      if (it.batchNo === batchNo && it.itemCode === itemCode) total += it.issueQty || 0;
    }));
    return total;
  }, [issues]);

  const getPendingQty = useCallback((batchNo: string, txType: string, itemCode: string): number => {
    const ok = txType === 'Purchase' ? getPsirOkQty(batchNo, itemCode)
      : txType === 'Vendor' ? getVsirOkQty(batchNo, itemCode) : 0;
    return Math.max(0, ok - getIssuedQty(batchNo, itemCode));
  }, [getPsirOkQty, getVsirOkQty, getIssuedQty]);

  // ── Available batches (with pending > 0) ─────────────────────────────────
  const availableBatches = useMemo(() => {
    const { transactionType: tx, itemCode } = itemInput;
    if (!itemCode || !tx) return [];
    if (tx === 'Purchase') return getPsirBatchesForItem(itemCode).filter(b => getPendingQty(b, 'Purchase', itemCode) > 0);
    if (tx === 'Vendor') return getVsirBatchesForItem(itemCode).filter(b => getPendingQty(b, 'Vendor', itemCode) > 0);
    if (tx === 'Stock') return getStockQtysForItem(itemCode);
    return [];
  }, [itemInput.transactionType, itemInput.itemCode, getPsirBatchesForItem, getVsirBatchesForItem, getStockQtysForItem, getPendingQty]); // eslint-disable-line

  // ── Batch info for selected batch ─────────────────────────────────────────
  const batchInfo = useMemo(() => {
    const { batchNo, transactionType: tx, itemCode } = itemInput;
    if (!batchNo || !itemCode) return null;
    if (tx === 'Purchase') {
      const ok = getPsirOkQty(batchNo, itemCode);
      const pending = getPendingQty(batchNo, 'Purchase', itemCode);
      return { ok, pending, label: 'PSIR OK' };
    }
    if (tx === 'Vendor') {
      const ok = getVsirOkQty(batchNo, itemCode);
      const pending = getPendingQty(batchNo, 'Vendor', itemCode);
      return { ok, pending, label: 'VSIR OK' };
    }
    if (tx === 'Stock') return { ok: Number(batchNo), pending: Number(batchNo), label: 'Stock' };
    return null;
  }, [itemInput.batchNo, itemInput.transactionType, itemInput.itemCode, getPsirOkQty, getVsirOkQty, getPendingQty]);

  // ── Auto-fill indentNo/oaNo/poNo from batch selection ────────────────────
  useEffect(() => {
    const { batchNo, transactionType: tx } = itemInput;
    if (!batchNo) return;
    if (tx === 'Purchase') {
      const p = psirData.find((r: any) => r.batchNo === batchNo);
      if (p) setNewIssue(prev => ({ ...prev, indentNo: p.indentNo || prev.indentNo, oaNo: p.oaNo || prev.oaNo, poNo: p.poNo || prev.poNo }));
    } else if (tx === 'Vendor') {
      const v = vsirData.find((r: any) => r.vendorBatchNo === batchNo);
      if (v) setNewIssue(prev => ({ ...prev, indentNo: v.indentNo || prev.indentNo, oaNo: v.oaNo || prev.oaNo, poNo: v.poNo || prev.poNo }));
    }
  }, [itemInput.batchNo, itemInput.transactionType, psirData, vsirData]);

  // ── Auto-fill reqNo from VendorDept DC No when PO changes ────────────────
  useEffect(() => {
    if (!newIssue.poNo) return;
    try {
      const raw = localStorage.getItem('vendorDeptData');
      const dept = raw ? JSON.parse(raw) : [];
      const match = Array.isArray(dept) ? dept.find((o: any) => o.materialPurchasePoNo === newIssue.poNo) : null;
      if (match?.dcNo?.trim()) { setNewIssue(prev => ({ ...prev, reqNo: match.dcNo })); return; }
    } catch {}
  }, [newIssue.poNo]);

  // ── Flat rows ────────────────────────────────────────────────────────────
  type FlatRow = InHouseIssue & { _item: InHouseIssueItem; _issueIdx: number; _itemIdx: number };

  const flatRows = useMemo((): FlatRow[] => {
    const rows: FlatRow[] = [];
    issues.forEach((iss, ii) => {
      if (!iss.items?.length) {
        rows.push({ ...iss, _item: { ...BLANK_ITEM }, _issueIdx: ii, _itemIdx: -1 });
      } else {
        iss.items.forEach((item, ji) => rows.push({ ...iss, _item: item, _issueIdx: ii, _itemIdx: ji }));
      }
    });
    return rows;
  }, [issues]);

  const filtered = useMemo(() => {
    let rows = flatRows;
    if (fSearch.trim()) {
      const t = fSearch.trim().toUpperCase();
      rows = rows.filter(r => [r.reqNo, r.issueNo, r.poNo, r.oaNo, r.vendor, r._item.itemName, r._item.itemCode, r._item.batchNo].some(v => String(v || '').toUpperCase().includes(t)));
    }
    if (fTxType) rows = rows.filter(r => r._item.transactionType === fTxType);
    if (fReqBy) rows = rows.filter(r => r._item.reqBy === fReqBy);
    if (fClosed === 'closed') rows = rows.filter(r => r._item.reqClosed);
    if (fClosed === 'open') rows = rows.filter(r => !r._item.reqClosed);
    if (fFrom) rows = rows.filter(r => r.reqDate >= fFrom);
    if (fTo) rows = rows.filter(r => r.reqDate <= fTo);
    return rows;
  }, [flatRows, fSearch, fTxType, fReqBy, fClosed, fFrom, fTo]);

  const activeFilters = [fSearch, fTxType, fReqBy, fClosed, fFrom, fTo].filter(Boolean).length;

  const stats = useMemo(() => ({
    total: issues.length,
    items: issues.reduce((s, i) => s + i.items.length, 0),
    totalQty: flatRows.reduce((s, r) => s + (r._item.issueQty || 0), 0),
    closed: flatRows.filter(r => r._item.reqClosed && r._itemIdx !== -1).length,
    open: flatRows.filter(r => !r._item.reqClosed && r._itemIdx !== -1).length,
  }), [issues, flatRows]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const clearForm = useCallback(() => {
    setNewIssue(blankIssue(issues)); setItemInput({ ...BLANK_ITEM });
    setEditIssueIdx(null); setEditItemIdx(null);
  }, [issues]);

  const handleSaveItem = useCallback(() => {
    if (!itemInput.itemName || !itemInput.itemCode || !itemInput.reqBy || itemInput.issueQty <= 0) {
      toast('Fill Item Name, Code, Req By and Issue Qty (> 0)', 'e'); return;
    }
    const sorted = (items: InHouseIssueItem[]) =>
      [...items].sort((a, b) => new Date(a.receivedDate || '').getTime() - new Date(b.receivedDate || '').getTime());

    if (editItemIdx !== null) {
      setNewIssue(p => ({ ...p, items: p.items.map((it, i) => i === editItemIdx ? { ...itemInput } : it) }));
      setEditItemIdx(null);
    } else {
      setNewIssue(p => ({ ...p, items: sorted([...p.items, { ...itemInput }]) }));
    }
    setItemInput({ ...BLANK_ITEM });
  }, [itemInput, editItemIdx, toast]);

  const handleAddIssue = useCallback(async () => {
    if (!newIssue.reqDate || !newIssue.reqNo || !newIssue.items.length) {
      toast('Fill Req Date, Req No and add at least one item', 'e'); return;
    }
    if (!userUid) { toast('Please sign in to add issues', 'e'); return; }
    const toSave = { ...newIssue, issueNo: getNextIssueNo(issues) };
    try {
      await addInHouseIssue(userUid, toSave);
      toast('Issue saved ✓', 's'); clearForm();
    } catch { toast('Failed to save — please retry', 'e'); }
  }, [newIssue, issues, userUid, clearForm, toast]);

  const handleUpdateIssue = useCallback(async () => {
    if (editIssueIdx === null || !userUid || !issues[editIssueIdx]?.id) { toast('Cannot update: missing data', 'e'); return; }
    try {
      await updateInHouseIssue(userUid, issues[editIssueIdx].id!, newIssue);
      toast('Issue updated ✓', 's'); clearForm();
    } catch { toast('Update failed — please retry', 'e'); }
  }, [editIssueIdx, userUid, issues, newIssue, clearForm, toast]);

  const handleDeleteIssue = useCallback(async (idx: number) => {
    if (!window.confirm('Delete this issue?')) return;
    const issue = issues[idx];
    if (!userUid || !issue?.id) return;
    try { await deleteInHouseIssue(userUid, issue.id!); toast('Issue deleted', 's'); }
    catch { toast('Delete failed', 'e'); }
  }, [issues, userUid, toast]);

  const handleDeleteItem = useCallback(async (issueIdx: number, itemIdx: number) => {
    if (!window.confirm('Delete this item?')) return;
    const issue = issues[issueIdx];
    if (!userUid || !issue?.id) return;
    const updatedItems = issue.items.filter((_, i) => i !== itemIdx);
    try {
      if (!updatedItems.length) await deleteInHouseIssue(userUid, issue.id!);
      else await updateInHouseIssue(userUid, issue.id!, { ...issue, items: updatedItems });
      toast('Item deleted', 's');
    } catch { toast('Delete failed', 'e'); }
  }, [issues, userUid, toast]);

  const handleEditIssue = useCallback((idx: number) => {
    setNewIssue({ ...issues[idx] }); setItemInput({ ...BLANK_ITEM });
    setEditIssueIdx(idx); setEditItemIdx(null);
    setTimeout(() => editRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, [issues]);

  const clearFilters = () => { setFSearch(''); setFTxType(''); setFReqBy(''); setFClosed(''); setFFrom(''); setFTo(''); };
  const isEditing = editIssueIdx !== null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="ihm">
      {/* Toasts */}
      <div className="ihm-toasts">
        {toasts.map(t => <div key={t.id} className={`ihm-toast toast-${t.type}`}>{t.msg}</div>)}
      </div>

      <div className="ihm-inner">

        {/* ── Page header + unified toolbar ─────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: '#1a237e', letterSpacing: '-0.02em' }}>In-House Issues</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#9ca3af', fontWeight: 500 }}>Material requisition &amp; FIFO issue tracking</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div className="ihm-toolbar">
              {/* Filter toggle */}
              <button
                className={`ihm-btn ihm-btn-sm ${activeFilters > 0 ? 'ihm-btn-indigo' : 'ihm-btn-ghost'}`}
                style={{ position: 'relative' }}
                onClick={() => setFilterOpen(p => !p)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
                {activeFilters > 0 ? `Filters (${activeFilters})` : 'Filters'}
                {activeFilters > 0 && (
                  <span style={{ position: 'absolute', top: -7, right: -7, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 17, height: 17, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{activeFilters}</span>
                )}
              </button>

              <div className="ihm-divider-sm" />
              <span className="ihm-rowcount">{filtered.length === flatRows.length ? `${flatRows.length} rows` : `${filtered.length} / ${flatRows.length} rows`}</span>
              <div className="ihm-divider-sm" />

              {/* Export — same row as filters */}
              <button className="ihm-btn ihm-btn-sm ihm-btn-success" onClick={() => exportCSV(filtered as any)} title={`Export ${filtered.length} rows as CSV`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Export CSV
              </button>
            </div>

            {/* Active chips */}
            {activeFilters > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                {fSearch && <span className="ihm-chip">🔍 "{fSearch}" <span className="ihm-chip-x" onClick={() => setFSearch('')}>×</span></span>}
                {fTxType && <span className="ihm-chip">{fTxType} <span className="ihm-chip-x" onClick={() => setFTxType('')}>×</span></span>}
                {fReqBy && <span className="ihm-chip">By: {fReqBy} <span className="ihm-chip-x" onClick={() => setFReqBy('')}>×</span></span>}
                {fClosed && <span className="ihm-chip">{fClosed === 'closed' ? 'Closed' : 'Open'} <span className="ihm-chip-x" onClick={() => setFClosed('')}>×</span></span>}
                {fFrom && <span className="ihm-chip">From: {fFrom} <span className="ihm-chip-x" onClick={() => setFFrom('')}>×</span></span>}
                {fTo && <span className="ihm-chip">To: {fTo} <span className="ihm-chip-x" onClick={() => setFTo('')}>×</span></span>}
                <button className="ihm-btn ihm-btn-xs ihm-btn-ghost" onClick={clearFilters}>Clear all</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Filter panel ──────────────────────────────────────────── */}
        {filterOpen && (
          <div className="ihm-fpanel" style={{ marginBottom: 16 }}>
            <Field label="Search">
              <input className="ihm-input" style={{ minWidth: 210 }} autoFocus
                placeholder="Req No, PO, item, batch…"
                value={fSearch} onChange={e => setFSearch(e.target.value)} />
            </Field>
            <Field label="Tx Type">
              <select className="ihm-input ihm-select" style={{ minWidth: 120 }} value={fTxType} onChange={e => setFTxType(e.target.value)}>
                <option value="">All types</option>
                {TX_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Req By">
              <select className="ihm-input ihm-select" style={{ minWidth: 110 }} value={fReqBy} onChange={e => setFReqBy(e.target.value)}>
                <option value="">All</option>
                {REQ_BY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="ihm-input ihm-select" style={{ minWidth: 110 }} value={fClosed} onChange={e => setFClosed(e.target.value)}>
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </Field>
            <Field label="Date From">
              <input type="date" className="ihm-input" value={fFrom} onChange={e => setFFrom(e.target.value)} />
            </Field>
            <Field label="Date To">
              <input type="date" className="ihm-input" value={fTo} onChange={e => setFTo(e.target.value)} />
            </Field>
            <div style={{ alignSelf: 'flex-end', display: 'flex', gap: 8 }}>
              {activeFilters > 0 && <button className="ihm-btn ihm-btn-sm ihm-btn-ghost" onClick={clearFilters}>Clear all</button>}
              <button className="ihm-btn ihm-btn-sm ihm-btn-ghost" onClick={() => setFilterOpen(false)}>Close</button>
            </div>
          </div>
        )}

        {/* ── Stats bar ─────────────────────────────────────────────── */}
        <div className="ihm-card" style={{ marginBottom: 18, padding: '16px 24px' }}>
          <div className="ihm-stats">
            {[
              { val: stats.total, lbl: 'Requisitions', color: '#1a237e' },
              { val: stats.items, lbl: 'Line Items', color: '#1a237e' },
              { val: stats.totalQty, lbl: 'Total Issued', color: '#4f46e5' },
              { val: stats.open, lbl: 'Open', color: '#ef4444' },
              { val: stats.closed, lbl: 'Closed', color: '#16a34a' },
            ].map((s, i) => (
              <React.Fragment key={s.lbl}>
                {i > 0 && <div className="ihm-divider-v" />}
                <div className="ihm-stat">
                  <div className="ihm-stat-val" style={{ color: s.color }}>{s.val}</div>
                  <div className="ihm-stat-lbl">{s.lbl}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Add / Edit panel ──────────────────────────────────────── */}
        <div ref={editRef} className={`ihm-card ${isEditing ? 'ihm-card-edit' : ''}`} style={{ marginBottom: 20 }}>

          {/* Panel header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 22px', borderBottom: '1px solid #f0f1f5',
            background: isEditing ? '#eef2ff' : '#fafbff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 17 }}>{isEditing ? '✏️' : '＋'}</span>
              <span style={{ fontWeight: 700, fontSize: 14.5, color: isEditing ? '#1a237e' : '#374151' }}>
                {isEditing ? `Edit Requisition — ${newIssue.reqNo}` : 'New Requisition'}
              </span>
              {isEditing && <span style={{ background: '#c7d2fe', color: '#3730a3', padding: '2px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.05em' }}>EDIT MODE</span>}
            </div>
            {isEditing && <button className="ihm-btn ihm-btn-sm ihm-btn-ghost" onClick={clearForm}>✕ Discard</button>}
          </div>

          <div style={{ padding: '20px 22px' }}>

            {/* Req header bar */}
            <div className="ihm-refbar">
              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Req No</span>
              <input className="ihm-input ihm-input-ro" readOnly style={{ maxWidth: 160, flex: '0 0 auto' }} value={newIssue.reqNo} placeholder="Auto-generated" />

              <Field label="Req Date ✱" style={{ flex: '0 0 auto' }}>
                <input type="date" className="ihm-input" style={{ width: 160 }}
                  value={newIssue.reqDate} onChange={e => setNewIssue(p => ({ ...p, reqDate: e.target.value }))} />
              </Field>

              {newIssue.issueNo && <span className="ihm-refbar-meta">Issue: <strong style={{ color: '#4f46e5' }}>{newIssue.issueNo}</strong></span>}
              {newIssue.oaNo && <span className="ihm-refbar-meta">OA: <strong>{newIssue.oaNo}</strong></span>}
              {newIssue.poNo && <span className="ihm-refbar-meta">PO: <strong>{newIssue.poNo}</strong></span>}
              {newIssue.indentNo && <span className="ihm-refbar-meta">Indent: <strong>{newIssue.indentNo}</strong></span>}
            </div>

            {/* Item entry */}
            <div style={{ background: '#f8f9fc', borderRadius: 10, border: '1px solid #e2e4ea', padding: '16px 18px', marginBottom: 16 }}>
              <div className="ihm-sec" style={{ paddingTop: 0 }}>
                {editItemIdx !== null ? '✏ Edit Item' : '+ Add Item'}
              </div>

              {/* Row 1: identity + tx type */}
              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Field label="Item Name">
                  {itemNames.length > 0 ? (
                    <select className="ihm-input ihm-select" value={itemInput.itemName}
                      onChange={e => {
                        const v = e.target.value;
                        const found = itemMaster.find(it => it.itemName === v);
                        setItemInput(p => ({ ...p, itemName: v, itemCode: found?.itemCode || '', batchNo: '' }));
                      }}>
                      <option value="">— Select Item —</option>
                      {itemNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  ) : (
                    <input className="ihm-input" placeholder="e.g. Jaw Carrier 02"
                      value={itemInput.itemName} onChange={e => setItemInput(p => ({ ...p, itemName: e.target.value }))} />
                  )}
                </Field>
                <Field label="Item Code">
                  <input className="ihm-input" readOnly={itemNames.length > 0}
                    value={itemInput.itemCode} onChange={e => setItemInput(p => ({ ...p, itemCode: e.target.value, batchNo: '' }))} />
                </Field>
                <Field label="Transaction Type">
                  <select className="ihm-input ihm-select" value={itemInput.transactionType}
                    onChange={e => setItemInput(p => ({ ...p, transactionType: e.target.value, batchNo: '' }))}>
                    {TX_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Req By ✱">
                  <select className="ihm-input ihm-select" value={itemInput.reqBy}
                    onChange={e => setItemInput(p => ({ ...p, reqBy: e.target.value }))}>
                    <option value="">— Select —</option>
                    {REQ_BY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>

              {/* Row 2: batch + qty */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Field label={`Batch No${itemInput.transactionType === 'Stock' ? ' (Stock Qty)' : ' (pending qty > 0)'}`}>
                  <select className="ihm-input ihm-select" value={itemInput.batchNo}
                    onChange={e => setItemInput(p => ({ ...p, batchNo: e.target.value }))}>
                    <option value="">— Select —</option>
                    {availableBatches.length > 0
                      ? availableBatches.map(b => {
                          const pending = itemInput.transactionType !== 'Stock' ? getPendingQty(b, itemInput.transactionType, itemInput.itemCode) : 0;
                          return <option key={b} value={b}>{b}{pending > 0 ? ` (Pending: ${pending})` : ''}</option>;
                        })
                      : <option disabled value="">No batches available</option>
                    }
                  </select>
                </Field>
                <Field label="Issue Qty ✱">
                  <NumInput value={itemInput.issueQty} onChange={n => setItemInput(p => ({ ...p, issueQty: n }))} />
                </Field>
                <Field label="Received Date (FIFO)">
                  <input type="date" className="ihm-input" value={itemInput.receivedDate || ''}
                    onChange={e => setItemInput(p => ({ ...p, receivedDate: e.target.value }))} />
                </Field>
                <Field label="Req Closed">
                  <div style={{ paddingTop: 9 }}>
                    <label className="ihm-checkbox">
                      <input type="checkbox" checked={itemInput.reqClosed}
                        onChange={e => setItemInput(p => ({ ...p, reqClosed: e.target.checked }))} />
                      <span>{itemInput.reqClosed ? 'Yes — closed' : 'No — open'}</span>
                    </label>
                  </div>
                </Field>
              </div>

              {/* Batch info panel (replaces the debug-heavy text input) */}
              {batchInfo && itemInput.batchNo && (
                <div className="ihm-batch-info" style={{ marginBottom: 12 }}>
                  <div>
                    <div className="bi-label">{batchInfo.label} Qty</div>
                    <div className="bi-val">{batchInfo.ok}</div>
                  </div>
                  <div style={{ width: 1, height: 32, background: '#bbf7d0' }} />
                  <div>
                    <div className="bi-label">Already Issued</div>
                    <div className="bi-val">{batchInfo.ok - batchInfo.pending}</div>
                  </div>
                  <div style={{ width: 1, height: 32, background: '#bbf7d0' }} />
                  <div>
                    <div className="bi-label">Pending</div>
                    <div className={`bi-val ${batchInfo.pending === 0 ? 'bi-pending' : ''}`}>{batchInfo.pending}</div>
                  </div>
                  {itemInput.issueQty > batchInfo.pending && batchInfo.pending > 0 && (
                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '5px 10px', fontSize: 11.5, color: '#b45309', fontWeight: 600, fontFamily: 'inherit' }}>
                      ⚠ Issue qty exceeds pending ({batchInfo.pending})
                    </div>
                  )}
                </div>
              )}

              {/* Item actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="ihm-btn ihm-btn-primary" onClick={handleSaveItem}>
                  {editItemIdx !== null ? '✓ Update Item' : '+ Add Item'}
                </button>
                {editItemIdx !== null && (
                  <button className="ihm-btn ihm-btn-ghost" onClick={() => { setEditItemIdx(null); setItemInput({ ...BLANK_ITEM }); }}>Cancel</button>
                )}
              </div>
            </div>

            {/* Items preview */}
            {newIssue.items.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8b95a1', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  Items in this requisition ({newIssue.items.length})
                </div>
                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e4ea' }}>
                  <table className="ihm-itable">
                    <thead>
                      <tr>
                        <th>Item Name</th><th>Code</th><th>Type</th>
                        <th>Batch</th><th>Req By</th><th className="r">Issue Qty</th>
                        <th>Closed</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newIssue.items.map((it, ii) => (
                        <tr key={ii}>
                          <td><span className="ellipsis" style={{ maxWidth: 160 }} title={it.itemName}>{it.itemName}</span></td>
                          <td><span className="mono" style={{ color: '#6366f1' }}>{it.itemCode}</span></td>
                          <td><TxBadge val={it.transactionType} /></td>
                          <td><span className="mono" style={{ color: '#6b7280', fontSize: 11 }}>{it.batchNo || '—'}</span></td>
                          <td><ReqByBadge val={it.reqBy} /></td>
                          <td className="r" style={{ fontWeight: 600 }}>{it.issueQty}</td>
                          <td><ClosedBadge closed={it.reqClosed} /></td>
                          <td>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="ihm-btn ihm-btn-xs ihm-btn-warning" onClick={() => { setItemInput(it); setEditItemIdx(ii); }}>Edit</button>
                              <button className="ihm-btn ihm-btn-xs ihm-btn-danger" onClick={() => setNewIssue(p => ({ ...p, items: p.items.filter((_, xi) => xi !== ii) }))}>✕</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Save */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className={`ihm-btn ${isEditing ? 'ihm-btn-primary' : 'ihm-btn-success'}`} style={{ minWidth: 180 }}
                onClick={isEditing ? handleUpdateIssue : handleAddIssue}
                disabled={!userUid}
                title={!userUid ? 'Sign in to save' : undefined}>
                {isEditing ? '✓ Save Changes' : '+ Add Requisition'}
              </button>
              {isEditing && <button className="ihm-btn ihm-btn-ghost" onClick={clearForm}>Discard</button>}
            </div>

          </div>
        </div>

        {/* ── Issues table ──────────────────────────────────────────── */}
        <div className="ihm-card">
          <div style={{ padding: '13px 20px', borderBottom: '1px solid #f0f1f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1a237e' }}>Requisitions</span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              {activeFilters > 0 ? `Filtered: ${filtered.length} of ${flatRows.length}` : `${flatRows.length} total rows`}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="ihm-table">
              <colgroup>
                <col style={{ width: 34 }} /><col style={{ width: 90 }} /><col style={{ width: 82 }} />
                <col style={{ width: 82 }} /><col style={{ width: 72 }} /><col style={{ width: 68 }} />
                <col style={{ width: 68 }} /><col style={{ width: 130 }} /><col style={{ width: 88 }} />
                <col style={{ width: 80 }} /><col style={{ width: 72 }} /><col style={{ width: 55 }} />
                <col style={{ width: 68 }} /><col style={{ width: 75 }} /><col style={{ width: 88 }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="r">#</th>
                  <th>Req No</th><th>Date</th><th>Issue No</th>
                  <th>OA No</th><th>PO No</th><th>Indent No</th>
                  <th className="div-l">Item</th><th>Code</th>
                  <th>Type</th><th>Batch</th>
                  <th className="r div-l">Qty</th>
                  <th>Req By</th><th>Closed</th>
                  <th className="r">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={15}>
                      <div className="ihm-empty">
                        <div className="ihm-empty-icon">📄</div>
                        <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4, fontSize: 14 }}>
                          {activeFilters > 0 ? 'No rows match your filters' : 'No requisitions yet'}
                        </div>
                        <div style={{ fontSize: 12.5 }}>
                          {activeFilters > 0
                            ? <span>Try <span style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }} onClick={clearFilters}>clearing filters</span></span>
                            : 'Add your first requisition using the form above'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((row, ri) => (
                  <tr key={`${row._issueIdx}-${row._itemIdx}`}>
                    <td className="r" style={{ color: '#c4c9d4', fontWeight: 700, fontSize: 11 }}>{ri + 1}</td>
                    <td><span style={{ fontWeight: 600, fontSize: 12, color: '#1a237e' }}>{row.reqNo}</span></td>
                    <td style={{ color: '#6b7280', fontSize: 12 }}>{row.reqDate || '—'}</td>
                    <td><span className="mono" style={{ color: '#4f46e5', fontWeight: 600, fontSize: 11 }}>{row.issueNo}</span></td>
                    <td style={{ color: '#6b7280', fontSize: 12 }}>{row.oaNo || '—'}</td>
                    <td style={{ color: '#6b7280', fontSize: 12 }}>{row.poNo || '—'}</td>
                    <td style={{ color: '#6b7280', fontSize: 12 }}>{row.indentNo || '—'}</td>
                    <td className="div-l">
                      <span className="ellipsis" style={{ maxWidth: 118, fontWeight: 500 }} title={row._item.itemName}>
                        {row._item.itemName || <span style={{ color: '#d1d5db' }}>—</span>}
                      </span>
                    </td>
                    <td><span className="mono" style={{ color: '#6366f1' }}>{row._item.itemCode || '—'}</span></td>
                    <td><TxBadge val={row._item.transactionType} /></td>
                    <td><span className="mono" style={{ color: '#6b7280', fontSize: 11 }}>{row._item.batchNo || '—'}</span></td>
                    <td className="r div-l" style={{ fontWeight: 600 }}>{row._item.issueQty || '—'}</td>
                    <td><ReqByBadge val={row._item.reqBy} /></td>
                    <td><ClosedBadge closed={row._item.reqClosed} /></td>
                    <td className="r">
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                        <button className="ihm-btn ihm-btn-xs ihm-btn-primary" onClick={() => handleEditIssue(row._issueIdx)}>Edit</button>
                        <button className="ihm-btn ihm-btn-xs ihm-btn-danger"
                          onClick={() => row._itemIdx === -1
                            ? handleDeleteIssue(row._issueIdx)
                            : handleDeleteItem(row._issueIdx, row._itemIdx)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

>>>>>>> ea2b60370e32f18454b4b30c524aa7881340b2ee
      </div>
    </div>
  );
};

<<<<<<< HEAD
export default InHouseIssueModule;
=======
export default InHouseIssueModule;
>>>>>>> ea2b60370e32f18454b4b30c524aa7881340b2ee
