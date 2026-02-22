<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import bus from '../utils/eventBus';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { getPurchaseOrders, getPurchaseData, subscribeVendorDepts, addVendorDept, updateVendorDept, deleteVendorDept } from '../utils/firestoreServices';
import { subscribeVSIRRecords } from '../utils/firestoreServices';
import { subscribePsirs } from '../utils/psirService';

// ...existing code...

interface VendorDeptItem {
	itemName: string;
	itemCode: string;
	materialIssueNo: string;
	qty: number;
	plannedQty?: number;
	closingStock?: number | string;
	indentStatus: string;
	receivedQty: number;
	okQty: number;
	reworkQty: number;
	rejectedQty: number;
	grnNo: string;
	debitNoteOrQtyReturned: string;
	remarks: string;
}

interface VendorDeptOrder {
	id?: string;
	orderPlaceDate: string;
	materialPurchasePoNo: string;
	oaNo: string;
	batchNo: string;
	vendorBatchNo: string;
	dcNo: string;
	vendorName: string;
	items: VendorDeptItem[];
}

const indentStatusOptions = ['Open', 'Closed', 'Partial'];

// Helper: robust numeric extractor: trims and parses numeric fields across various possible keys
const getNumericField = (obj: any, keys: string[]): number | null => {
	for (const k of keys) {
		if (obj && obj[k] !== undefined && obj[k] !== null) {
			const raw = String(obj[k]).trim();
			if (raw !== '') {
				const n = Number(raw);
				if (!isNaN(n)) return n;
			}
		}
	}
	return null;
};

// Helper: find which numeric field/key exists (returns key, raw string and parsed value)
const findNumericField = (obj: any, keys: string[]): { key: string; raw: string; value: number } | null => {
	for (const k of keys) {
		if (obj && obj[k] !== undefined && obj[k] !== null) {
			const raw = String(obj[k]).trim();
			if (raw !== '') {
				const n = Number(raw);
				if (!isNaN(n)) return { key: k, raw, value: n };
			}
		}
	}
	return null;
};

// Helper: choose best stock record when multiple candidates match.
// Strategy: prefer explicit closingStock (or its numeric equivalent), otherwise use computed stockQty + purchaseActualQtyInStore.
// Tie-breaker: higher computed value, then larger id (assumed later entries have larger ids).
const chooseBestStock = (candidates: any[]) => {
	if (!Array.isArray(candidates) || candidates.length === 0) return null;
	const closingKeys = ['closingStock','closing_stock','ClosingStock','closing','closingQty','closing_qty','Closing','closing stock','Closing Stock','closingstock','closingStockQty','closing_stock_qty','ClosingStockQty','closingstockqty'];
	const stockQtyKeys = ['stockQty','stock_qty','stock','StockQty','currentStock'];
	const purchaseKeys = ['purchaseActualQtyInStore','purchase_actual_qty_in_store','purchaseActualQty','purchase_actual_qty','purchaseActualQtyInStore'];
	let best: any = null;
	let bestVal = Number.NEGATIVE_INFINITY;
	for (const s of candidates) {
		const c = findNumericField(s, closingKeys);
		const closing = c ? c.value : null;
		const stockQty = getNumericField(s, stockQtyKeys) || 0;
		const pQty = getNumericField(s, purchaseKeys) || 0;
		const computed = (closing !== null ? closing : (stockQty + pQty)) || 0;
		if (best === null || computed > bestVal) { best = s; bestVal = computed; }
		else if (computed === bestVal) {
			if ((s.id || 0) > ((best.id || 0))) best = s;
		}
	}
	return best;
};

// Helper: get PO qty (purchaseQty / qty / originalIndentQty) from purchaseOrders or purchaseData
const getPurchaseQty = (poNo: string | undefined, itemCode: string | undefined, purchaseOrders?: any[], purchaseData?: any[]): number => {
	try {
		if (!poNo || !itemCode) return 0;
		const norm = (v: any) => (v === undefined || v === null) ? '' : String(v).trim().toUpperCase();
		const tPo = norm(poNo);
		const tCode = norm(itemCode);

		if (purchaseOrders && Array.isArray(purchaseOrders)) {
			const pos = purchaseOrders;
			if (Array.isArray(pos)) {
				const po = pos.find((p: any) => norm(p.poNo) === tPo);
				if (po) {
					if (Array.isArray(po.items)) {
						const match = po.items.find((it: any) => norm(it.itemCode || it.Code) === tCode);
						if (match) {
							// Prefer explicit PO quantity fields when available (poQty / originalIndentQty / qty)
							const poPreferred = Number(match.poQty ?? match.originalIndentQty ?? match.qty ?? 0);
							if (poPreferred > 0) return poPreferred;

							// If no explicit poQty on purchaseOrders entry, check purchaseData for a better po quantity
							const purchaseDataRaw = localStorage.getItem('purchaseData');
							if (purchaseDataRaw) {
								try {
									const pds = JSON.parse(purchaseDataRaw);
									if (Array.isArray(pds)) {
										const pdMatch = pds.find((it: any) => (norm(it.poNo) === tPo || norm(it.indentNo) === tPo) && norm(it.itemCode || it.Code) === tCode);
										if (pdMatch) {
											const pdPreferred = Number(pdMatch.poQty ?? pdMatch.originalIndentQty ?? pdMatch.qty ?? 0);
											if (pdPreferred > 0) return pdPreferred;
										}
									}
								} catch {}
							}

							const rawVal = Number(match.purchaseQty ?? 0);
							if (rawVal > 0) return rawVal;
							return poPreferred || rawVal;
						}
					} else {
						if (norm(po.itemCode || po.Code) === tCode) return Number(po.purchaseQty ?? po.qty ?? po.originalIndentQty ?? 0);
					}
				}
			}
		}

		if (purchaseData && Array.isArray(purchaseData)) {
			const pd = purchaseData;
			if (Array.isArray(pd)) {
				const match = pd.find((it: any) => (norm(it.poNo) === tPo || norm(it.indentNo) === tPo) && norm(it.itemCode || it.Code) === tCode);
				if (match) {
					// Prefer explicit poQty/originalIndentQty/qty on purchaseData match too
					const poPreferred = Number(match.poQty ?? match.originalIndentQty ?? match.qty ?? 0);
					if (poPreferred > 0) return poPreferred;
					const rawVal = Number(match.purchaseQty ?? 0);
					if (rawVal > 0) return rawVal;
					return poPreferred || rawVal;
				}
			}
		}
	} catch (err) {
		console.error('[VendorDeptModule] getPurchaseQty error', err);
	}
	return 0;
};

// Prefer Purchase module's status when available (search purchaseData / purchaseOrders)
const getIndentStatusFromPurchase = (poNo: any, itemCode: any, indentNo: any, purchaseData?: any[], purchaseOrders?: any[]): string => {
	try {
		const norm = (v: any) => (v === undefined || v === null) ? '' : String(v).trim().toUpperCase();
		const tPo = norm(poNo);
		const tCode = norm(itemCode);
		const tIndent = norm(indentNo);

		// Check purchaseData first
		if (purchaseData && Array.isArray(purchaseData)) {
			const pd = purchaseData;
			if (Array.isArray(pd)) {
				const found = pd.find((it: any) => (
					((norm(it.poNo) === tPo) || (norm(it.indentNo) === tIndent)) && (norm(it.itemCode || it.Code) === tCode)
				));
				if (found && found.indentStatus) return String(found.indentStatus);
			}
		}

		// Then check purchaseOrders (PO -> items)
		if (purchaseOrders && Array.isArray(purchaseOrders)) {
			const pos = purchaseOrders;
			if (Array.isArray(pos)) {
				const po = pos.find((p: any) => norm(p.poNo) === tPo || norm(p.poNo || p.indentNo) === tPo);
				if (po) {
					if (Array.isArray(po.items)) {
						const mit = po.items.find((it: any) => norm(it.itemCode || it.Code) === tCode);
						if (mit && mit.indentStatus) return String(mit.indentStatus);
					} else {
						if (po.itemCode && norm(po.itemCode) === tCode && po.indentStatus) return String(po.indentStatus);
					}
				}
			}
		}

		return '';
	} catch (err) {
		return '';
	}
};

// Helper: Get supplier name from Purchase module by PO No
const getSupplierNameFromPO = (poNo: any, purchaseOrders?: any[], purchaseData?: any[]): string => {
	try {
		if (!poNo) return '';
		const poNoNormalized = String(poNo).trim().toUpperCase();
		
		// Check Purchase Orders first
		if (purchaseOrders && Array.isArray(purchaseOrders)) {
			if (Array.isArray(purchaseOrders)) {
				const po = purchaseOrders.find((p: any) => String(p.poNo || '').trim().toUpperCase() === poNoNormalized);
				if (po && po.supplierName) {
					return String(po.supplierName).trim();
				}
			}
		}
		
		// Fall back to Purchase Data
		if (purchaseData && Array.isArray(purchaseData)) {
			if (Array.isArray(purchaseData)) {
				const entry = purchaseData.find((p: any) => String(p.poNo || '').trim().toUpperCase() === poNoNormalized);
				if (entry && entry.supplierName) {
					return String(entry.supplierName).trim();
				}
			}
		}
		
		return '';
	} catch (err) {
		console.error('[VendorDept] Error getting supplier name:', err);
		return '';
	}
};

// Helper: Get vendorBatchNo from VSIR module if available
const getVendorBatchNoFromVSIR = (poNo: any, vsirRecords?: any[]): string => {
	try {
		if (!poNo) {
			console.log('[VendorDept] getVendorBatchNoFromVSIR called with empty poNo');
			return '';
		}
		const poNoNormalized = String(poNo).trim();
		console.log('[VendorDept] Looking for vendorBatchNo for PO:', poNoNormalized);
		
		console.log('[VendorDept] VSIR data exists:', !!vsirRecords);
		if (!vsirRecords) {
			console.log('[VendorDept] No VSIR data found');
			return '';
		}
		// vsirRecords is already an array
		if (!Array.isArray(vsirRecords)) {
			console.log('[VendorDept] VSIR data is not an array');
			// Try to handle as array anyway
		}
		
		console.log('[VendorDept] VSIR records count:', vsirRecords.length);
		if (vsirRecords.length > 0) {
			console.log('[VendorDept] First VSIR record structure:', JSON.stringify(vsirRecords[0]));
			console.log('[VendorDept] All VSIR POs:', vsirRecords.map((r: any) => r.poNo).join(', '));
			console.log('[VendorDept] Looking for PO match with:', poNoNormalized);
		}
		
		// Find first VSIR record matching this PO with a vendorBatchNo (normalized comparison)
		const match = vsirRecords.find((r: any) => {
			const rPoNo = String(r.poNo || '').trim();
			const hasVendorBatchNo = r.vendorBatchNo && String(r.vendorBatchNo).trim();
			return rPoNo === poNoNormalized && hasVendorBatchNo;
		});
		
		if (match) {
			console.log('[VendorDept] ✓ Match found! vendorBatchNo:', match.vendorBatchNo);
			return match.vendorBatchNo;
		} else {
			console.log('[VendorDept] ✗ No matching VSIR record found for PO:', poNoNormalized);
		}
		return '';
	} catch (err) {
		console.log('[VendorDept] Error getting vendorBatchNo from VSIR:', err);
		return '';
	}
};

// Helper: Get PSIR data for a given PO
const getPSIRDataByPO = (poNo: string | undefined, psirData?: any[]): any => {
	try {
		if (!poNo) return null;
		if (!psirData) return null;
		if (!Array.isArray(psirData)) return null;
		const match = psirData.find((r: any) => String(r.poNo || '').trim() === String(poNo).trim());
		return match || null;
	} catch (err) {
		console.error('[VendorDept] Error getting PSIR data:', err);
		return null;
	}
};

const VendorDeptModule: React.FC = () => {
	// Debug state for OK Qty auto-fill (must be declared here for all logic/JSX)
	const [debugOkQty, setDebugOkQty] = useState<any>(null);

	// Declare newOrder state before any useEffect that uses it
	const [newOrder, setNewOrder] = useState<VendorDeptOrder>({
		orderPlaceDate: '',
		materialPurchasePoNo: '',
		oaNo: '',
		batchNo: '',
		vendorBatchNo: '',
		dcNo: '', // Always default to empty string
		vendorName: '',
		items: [],
	});

	// Current authenticated user's UID (if logged in)
	const [userUid, setUserUid] = useState<string | null>(null);

	// Accept Firestore state variables as props
	const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
	const [purchaseData, setPurchaseData] = useState<any[]>([]);
	const [vsirRecords, setVsirRecords] = useState<any[]>([]);
	const [psirData, setPsirData] = useState<any[]>([]);

	// Listen to authentication state
	useEffect(() => {
		const unsub = onAuthStateChanged(auth, (u) => {
			const uid = u ? u.uid : null;
			console.info('[VendorDeptModule] Auth state changed - userUid:', uid);
			setUserUid(uid);
		});
		return () => unsub();
	}, []);

	// Subscribe to vendorDepts from Firestore in real-time
	useEffect(() => {
		let unsub: (() => void) | null = null;
		if (!userUid) {
			console.debug('[VendorDeptModule] Skipping vendorDepts subscription - no userUid');
			return;
		}
		console.debug('[VendorDeptModule] Setting up vendorDepts subscription for userId:', userUid);
		unsub = subscribeVendorDepts(userUid, (docs) => {
			console.info('[VendorDeptModule] ✓ Loaded', docs.length, 'vendor dept orders from Firebase');
			setOrders(docs);
		});
		return () => {
			if (unsub) unsub();
		};
	}, [userUid]);

	// Load purchase orders, purchase data, VSIR, and PSIR from Firestore
	useEffect(() => {
		const loadData = async () => {
			try {
				if (!userUid) {
					console.debug('[VendorDeptModule] Skipping data load - userUid is not set');
					return;
				}
				console.info('[VendorDeptModule] Starting data load for user:', userUid);
				
				const [poData, purchaseDataData] = await Promise.all([
					getPurchaseOrders(userUid),
					getPurchaseData(userUid),
				]);
				
				if (Array.isArray(poData)) {
					setPurchaseOrders(poData);
					console.debug('[VendorDeptModule] Loaded', poData.length, 'purchase orders');
				}
				
				if (Array.isArray(purchaseDataData)) {
					setPurchaseData(purchaseDataData);
					console.debug('[VendorDeptModule] Loaded', purchaseDataData.length, 'purchase data records');
				}
			} catch (e) {
				console.error('[VendorDeptModule] Error loading purchase data:', e);
			}
		};

		loadData();
	}, [userUid]);

	// Subscribe to VSIR records from Firestore
	useEffect(() => {
		let unsub: (() => void) | null = null;
		if (!userUid) {
			console.debug('[VendorDeptModule] Skipping VSIR subscription - no userUid');
			return;
		}
		console.debug('[VendorDeptModule] Setting up VSIR subscription for userId:', userUid);
		unsub = subscribeVSIRRecords(userUid, (docs) => {
			console.debug('[VendorDeptModule] VSIR records updated:', docs.length, 'records');
			setVsirRecords(docs);
		});
		return () => {
			if (unsub) unsub();
		};
	}, [userUid]);

	// Subscribe to PSIR records from Firestore
	useEffect(() => {
		let unsub: (() => void) | null = null;
		if (!userUid) {
			console.debug('[VendorDeptModule] Skipping PSIR subscription - no userUid');
			return;
		}
		console.debug('[VendorDeptModule] Setting up PSIR subscription for userId:', userUid);
		unsub = subscribePsirs(userUid, (docs) => {
			console.debug('[VendorDeptModule] PSIR records updated:', docs.length, 'records');
			setPsirData(docs);
		});
		return () => {
			if (unsub) unsub();
		};
	}, [userUid]);

	// Debug: Log data state changes
	useEffect(() => {
		// Use purchaseOrders if available, fallback to purchaseData
		const ordersToCheck = purchaseOrders && Array.isArray(purchaseOrders) && purchaseOrders.length > 0 ? purchaseOrders : purchaseData;
		
		if (ordersToCheck && Array.isArray(ordersToCheck)) {
			const poList = ordersToCheck.map((order: any) => order.poNo).filter(Boolean);
			setPurchasePOs(poList);
			console.debug('[VendorDeptModule] Updated PO list from', purchaseOrders.length > 0 ? 'purchaseOrders' : 'purchaseData', ':', poList.length, 'POs');
			
			// Always auto-select latest if not set
			if (poList.length > 0 && !newOrder.materialPurchasePoNo) {
				setNewOrder(prev => ({ ...prev, materialPurchasePoNo: poList[poList.length - 1] }));
				console.debug('[VendorDeptModule] Auto-selected latest PO:', poList[poList.length - 1]);
			}
		}
	}, [newOrder.materialPurchasePoNo, purchaseOrders, purchaseData]);

	// Get all PO numbers from PurchaseModule state
	const [purchasePOs, setPurchasePOs] = useState<string[]>([]);
	useEffect(() => {
		// Use purchaseOrders if available, fallback to purchaseData
		const ordersToCheck = purchaseOrders && Array.isArray(purchaseOrders) && purchaseOrders.length > 0 ? purchaseOrders : purchaseData;
		
		if (ordersToCheck && Array.isArray(ordersToCheck)) {
			const poList = ordersToCheck.map((order: any) => order.poNo).filter(Boolean);
			setPurchasePOs(poList);
			console.debug('[VendorDeptModule] Updated PO list from', purchaseOrders.length > 0 ? 'purchaseOrders' : 'purchaseData', ':', poList.length, 'POs');
			
			// Always auto-select latest if not set
			if (poList.length > 0 && !newOrder.materialPurchasePoNo) {
				setNewOrder(prev => ({ ...prev, materialPurchasePoNo: poList[poList.length - 1] }));
				console.debug('[VendorDeptModule] Auto-selected latest PO:', poList[poList.length - 1]);
			}
		}
	}, [newOrder.materialPurchasePoNo, purchaseOrders, purchaseData]);

	const [orders, setOrders] = useState<VendorDeptOrder[]>([]);
	useEffect(() => {
		// Update orders when vsirRecords changes
		if (orders.length > 0) {
			const updated = orders.map((order: any) => {
				let vendorBatchNo = order.vendorBatchNo || '';
				if (!vendorBatchNo) {
					vendorBatchNo = getVendorBatchNoFromVSIR(order.materialPurchasePoNo, vsirRecords);
				}
				return {
					...order,
					vendorBatchNo,
					items: Array.isArray(order.items) ? order.items : [],
				};
			});
			setOrders(updated);
		}
	}, [vsirRecords]);

	// Sync vendorBatchNo from VSIR on component mount
	useEffect(() => {
		console.log('[VendorDept] Syncing vendorBatchNo from VSIR on mount for all existing orders');
		setOrders(prevOrders => {
			const syncedOrders = prevOrders.map(order => {
				if (!order.vendorBatchNo || !order.vendorBatchNo.trim()) {
					const vendorBatchNo = getVendorBatchNoFromVSIR(order.materialPurchasePoNo, vsirRecords);
					if (vendorBatchNo && vendorBatchNo !== order.vendorBatchNo) {
						console.log(`[VendorDept] ✓ Synced vendorBatchNo for PO ${order.materialPurchasePoNo}: ${vendorBatchNo}`);
						return { ...order, vendorBatchNo };
					}
				}
				return order;
			});
			
			return syncedOrders;
		});
	}, [vsirRecords]); // Run when VSIR records change

	// Clean up debitNoteOrQtyReturned field that may have been incorrectly set to GRN data
	useEffect(() => {
		console.log('[VendorDept] Cleaning up debitNoteOrQtyReturned field with GRN-like values');
		setOrders(prevOrders => {
			const cleanedOrders = prevOrders.map(order => {
				const cleanedItems = order.items.map(item => {
					// If debitNoteOrQtyReturned looks like a GRN number (only digits, longer than 3), clear it
					if (item.debitNoteOrQtyReturned && /^\d{4,}$/.test(String(item.debitNoteOrQtyReturned).trim())) {
						console.log(`[VendorDept] ✓ Cleared GRN-like value from debitNoteOrQtyReturned for item ${item.itemCode}: "${item.debitNoteOrQtyReturned}"`);
						return { ...item, debitNoteOrQtyReturned: '' };
					}
					return item;
				});
				
				if (cleanedItems !== order.items) {
					return { ...order, items: cleanedItems };
				}
				return order;
			});
			
			return cleanedOrders;
		});
	}, []); // Run once on mount

	const [itemInput, setItemInput] = useState<VendorDeptItem>({
		itemName: '',
		itemCode: '',
		materialIssueNo: '',
		qty: 0,
		closingStock: '',
		indentStatus: '',
		receivedQty: 0,
		okQty: 0,
		reworkQty: 0,
		rejectedQty: 0,
		grnNo: '',
		debitNoteOrQtyReturned: '',
		remarks: '',
	});

	// Auto-fill Received, OK, Rework, and Rejected quantities from VSIR
	useEffect(() => {
		if (!newOrder.materialPurchasePoNo || !itemInput.itemCode) return;
		
		try {
			if (!vsirRecords) {
				console.debug('[VendorDeptModule][AutoFill] No VSIR records found');
				return;
			}
			
			if (!Array.isArray(vsirRecords)) return;
			
			// Find matching VSIR record for this PO and item (robust: trim, uppercase)
			const norm = (v: any) => (v === undefined || v === null) ? '' : String(v).trim().toUpperCase();
			const matchingVSIR = vsirRecords.find((vsir: any) =>
				norm(vsir.poNo) === norm(newOrder.materialPurchasePoNo) &&
				norm(vsir.itemCode) === norm(itemInput.itemCode)
			);
			
						if (matchingVSIR) {
								const receivedQty = matchingVSIR.qtyReceived || 0;
								let okQty = 0;
								let debugReason = '';
								if (typeof matchingVSIR.okQty === 'number' && matchingVSIR.okQty > 0) {
									okQty = matchingVSIR.okQty;
									debugReason = 'Used okQty from VSIR';
								} else if (typeof matchingVSIR.qtyReceived === 'number' && matchingVSIR.qtyReceived > 0) {
									okQty = matchingVSIR.qtyReceived;
									debugReason = 'okQty missing, used qtyReceived from VSIR';
								} else {
									debugReason = 'No okQty or qtyReceived found in VSIR';
								}
								const reworkQty = matchingVSIR.reworkQty || 0;
								const rejectedQty = matchingVSIR.rejectQty || 0;
								const grnNo = matchingVSIR.grnNo || '';
                
								setDebugOkQty({
									poNo: newOrder.materialPurchasePoNo,
									itemCode: itemInput.itemCode,
									matchingVSIR,
									receivedQty,
									okQty,
									reworkQty,
									rejectedQty,
									grnNo,
									debugReason
								});
                
								setItemInput(prev => ({
										...prev,
										receivedQty,
										okQty, // Auto-fill OK Qty from VSIR or fallback to qtyReceived
										reworkQty,
										rejectedQty,
										grnNo
								}));
						} else {
								setDebugOkQty({
									poNo: newOrder.materialPurchasePoNo,
									itemCode: itemInput.itemCode,
									matchingVSIR: null,
									debugReason: 'No matching VSIR record found'
								});
						}
			{/* Debug Panel for OK Qty auto-fill */}
			{debugOkQty && (
				<div style={{ margin: '16px 0', padding: 12, background: '#e3f2fd', border: '2px solid #1976d2', borderRadius: 4 }}>
					<h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>🛠️ OK Qty Auto-Fill Debug Panel</h4>
					<div style={{ fontSize: 13, marginBottom: 6 }}>
						<strong>PO No:</strong> {debugOkQty.poNo} &nbsp; <strong>Item Code:</strong> {debugOkQty.itemCode}
					</div>
					<div style={{ fontSize: 13, marginBottom: 6 }}>
						<strong>VSIR Match:</strong> {debugOkQty.matchingVSIR ? '✅ Found' : '❌ Not Found'}
					</div>
					<div style={{ fontSize: 13, marginBottom: 6 }}>
						<strong>Auto-filled OK Qty:</strong> {debugOkQty.okQty ?? '—'}
					</div>
					<div style={{ fontSize: 13, marginBottom: 6 }}>
						<strong>Reason:</strong> {debugOkQty.debugReason}
					</div>
					{debugOkQty.matchingVSIR && (
						<details style={{ fontSize: 12, marginTop: 6 }}>
							<summary>Show VSIR Record</summary>
							<pre style={{ background: '#f5f5f5', padding: 6, borderRadius: 3, fontSize: 11, margin: 0 }}>{JSON.stringify(debugOkQty.matchingVSIR, null, 2)}</pre>
						</details>
					)}
				</div>
			)}
		} catch (e) {
			console.error('[VendorDeptModule][AutoFill] Error reading VSIR data:', e);
		}
	}, [newOrder.materialPurchasePoNo, itemInput.itemCode]);

	// Auto-populate items from PSIR when PO changes (only if items list is empty)
	useEffect(() => {
		if (!newOrder.materialPurchasePoNo || newOrder.items.length > 0) return;
		
		try {
			const psirRecord = getPSIRDataByPO(newOrder.materialPurchasePoNo, psirData);
			if (psirRecord && psirRecord.items && Array.isArray(psirRecord.items)) {
				console.log('[VendorDeptModule][AutoPopulate] Found', psirRecord.items.length, 'items in PSIR for PO:', newOrder.materialPurchasePoNo);
				
				// Auto-populate items from PSIR
				const psirItems = psirRecord.items.map((item: any) => ({
					itemName: item.itemName || '',
					itemCode: item.itemCode || '',
					materialIssueNo: '', // Will be filled by user
					qty: item.qtyReceived || item.poQty || 0,
					closingStock: getClosingStock(item.itemCode, item.itemName),
					indentStatus: '',
					receivedQty: 0,
					okQty: 0,
					reworkQty: 0,
					rejectedQty: 0,
					grnNo: item.grnNo || '',
					debitNoteOrQtyReturned: '',
					remarks: '',
				}));
				
				setNewOrder(prev => ({ ...prev, items: psirItems }));
				console.log('[VendorDeptModule][AutoPopulate] Populated items from PSIR');
			}
		} catch (e) {
			console.error('[VendorDeptModule][AutoPopulate] Error:', e);
		}
	}, [newOrder.materialPurchasePoNo]);

	// Auto-fill qty from purchase when itemCode changes
	useEffect(() => {
		if (!newOrder.materialPurchasePoNo || !itemInput.itemCode) return;
		
		const poQty = getPurchaseQty(newOrder.materialPurchasePoNo, itemInput.itemCode, purchaseOrders, purchaseData);
		// Allow zero PO quantities: always populate the qty field even when PO qty is 0
		setItemInput(prev => ({ ...prev, qty: poQty }));
	}, [newOrder.materialPurchasePoNo, itemInput.itemCode, purchaseOrders, purchaseData]);

	// Sync quantities from VSIR to existing orders (trigger on orders or vsirRecords change)
	useEffect(() => {
		if (orders.length === 0) return;
		try {
			if (!vsirRecords) return;
			if (!Array.isArray(vsirRecords)) return;
			let updated = false;
			const updatedOrders = orders.map(order => {
				const updatedItems = order.items.map((item: any) => {
					// Find matching VSIR record
					const matchingVSIR = vsirRecords.find((vsir: any) =>
						vsir.poNo === order.materialPurchasePoNo &&
						vsir.itemCode === item.itemCode
					);
					if (matchingVSIR) {
						const newReceivedQty = matchingVSIR.qtyReceived || 0;
						const newOkQty = matchingVSIR.okQty || 0;
						const newReworkQty = matchingVSIR.reworkQty || 0;
						const newRejectedQty = matchingVSIR.rejectQty || 0;
						const newGrnNo = matchingVSIR.grnNo || '';
						// Only update if values differ
						if (newReceivedQty !== item.receivedQty || newOkQty !== item.okQty || 
								newReworkQty !== item.reworkQty || newRejectedQty !== item.rejectedQty ||
								newGrnNo !== item.grnNo) {
							console.debug('[VendorDeptModule][Sync] Updating VSIR data for PO:', order.materialPurchasePoNo, 'Item:', item.itemCode);
							updated = true;
							return {
								...item,
								receivedQty: newReceivedQty,
								okQty: newOkQty,
								reworkQty: newReworkQty,
								rejectedQty: newRejectedQty,
								grnNo: newGrnNo,
								// IMPORTANT: DO NOT modify debitNoteOrQtyReturned - it's a manual field
								debitNoteOrQtyReturned: item.debitNoteOrQtyReturned || ''
							};
						}
					}
					return item;
				});
				return { ...order, items: updatedItems };
			});
			if (updated) {
				console.debug('[VendorDeptModule][Sync] Syncing VSIR data to vendor dept orders');
				setOrders(updatedOrders);
				bus.dispatchEvent(new CustomEvent('vendorDept.updated', { detail: { source: 'vsir-sync' } }));
			}
		} catch (e) {
			console.error('[VendorDeptModule][Sync] Error syncing VSIR data:', e);
		}
	}, [orders, vsirRecords]);

	// Listen for VSIR updates
	useEffect(() => {
		const handleVSIRUpdate = () => {
			console.log('[VendorDeptModule] VSIR data updated event received');
			// Trigger sync by forcing a state update
			setOrders(prev => [...prev]);
		};

		const storageHandler = (e: StorageEvent) => {
			if (e.key === 'vsri-records') {
				handleVSIRUpdate();
			}
		};

		window.addEventListener('storage', storageHandler);
		bus.addEventListener('vsir.updated', handleVSIRUpdate as EventListener);
		console.log('[VendorDeptModule] Listeners registered for VSIR updates');

		return () => {
			window.removeEventListener('storage', storageHandler);
			bus.removeEventListener('vsir.updated', handleVSIRUpdate as EventListener);
			console.log('[VendorDeptModule] Listeners removed for VSIR updates');
		};
	}, []);

	// Debug: Log VSIR records and orders on component mount
	useEffect(() => {
		console.log('[VendorDeptModule] ========== MOUNT DIAGNOSTIC ==========');
		console.log('[VendorDeptModule] VSIR records:');
		if (vsirRecords) {
			try {
				console.log('[VendorDeptModule]   Count:', vsirRecords.length);
				console.log('[VendorDeptModule]   Full data:', JSON.stringify(vsirRecords, null, 2));
				vsirRecords.forEach((r: any, i: number) => {
					console.log(`[VendorDeptModule]   [${i}] poNo="${r.poNo}" vendorBatchNo="${r.vendorBatchNo}" itemCode="${r.itemCode}"`);
				});
			} catch (e) {
				console.log('[VendorDeptModule]   Error:', e);
			}
		} else {
			console.log('[VendorDeptModule]   No VSIR records found');
		}
		console.log('[VendorDeptModule] VendorDept orders:');
		console.log('[VendorDeptModule]   Count:', orders.length);
		orders.forEach((o: any, i: number) => {
			console.log(`[VendorDeptModule]   [${i}] materialPurchasePoNo="${o.materialPurchasePoNo}" vendorBatchNo="${o.vendorBatchNo}"`);
		});
		console.log('[VendorDeptModule] ======================================');
	}, []);

	const [itemNames] = useState<string[]>([]);
	const [itemMaster] = useState<{ itemName: string; itemCode: string }[]>([]);
	const [editIdx, setEditIdx] = useState<{orderIdx: number, itemIdx: number} | null>(null);

	// Debug panel state
	const [debugOpen, setDebugOpen] = useState(false);
	const [debugReport, setDebugReport] = useState<any[]>([]);

// Refresh closingStock values for all orders from stock records
const refreshOrdersClosingStock = () => {
	setOrders(prevOrders => prevOrders.map(order => ({
		...order,
		items: (order.items || []).map((it: any) => ({
			...it,
			closingStock: getClosingStock(it.itemCode, it.itemName),
		}))
	})));
};

// Track stock updates so component re-renders when stock-records change
const [, setStockVersion] = useState(0);
useEffect(() => {
	const handler = () => { refreshOrdersClosingStock(); setStockVersion(v => v + 1); };
		// Listen for stock changes from StockModule or other tabs
		bus.addEventListener('stock.updated', handler as EventListener);
		const storageHandler = (e: StorageEvent) => { if ((e as any)?.key === 'stock-records') handler(); };
		window.addEventListener('storage', storageHandler);
		return () => {
			bus.removeEventListener('stock.updated', handler as EventListener);
			window.removeEventListener('storage', storageHandler as EventListener);
		};
	}, []);

	// Update orders when VSIR records change
	useEffect(() => {
		console.log('[VendorDept] VSIR records updated, syncing vendorBatchNo to orders');
		if (orders.length === 0) return;
		
		setOrders(prevOrders => {
			const updated = prevOrders.map(order => {
				// If vendorBatchNo is empty or missing, try to get from VSIR
				if (!order.vendorBatchNo || !order.vendorBatchNo.trim()) {
					const vsirBatchNo = getVendorBatchNoFromVSIR(order.materialPurchasePoNo, vsirRecords);
					if (vsirBatchNo) {
						return { ...order, vendorBatchNo: vsirBatchNo };
					}
				}
				return order;
			});
			
			return updated;
		});
	}, [vsirRecords]);

	// Auto-backfill batchNo from PSIR when psirData changes
	useEffect(() => {
		if (!psirData || !Array.isArray(psirData) || orders.length === 0) return;
		
		console.log('[VendorDeptModule] Auto-backfilling batchNo from PSIR for existing orders...');
		try {
			setOrders(prevOrders => {
				const updated = prevOrders.map(order => {
					// If order already has batchNo, skip it
					if (order.batchNo && String(order.batchNo).trim()) {
						return order;
					}
					
					// Find matching PSIR record by PO number
					const matchingPSIR = psirData.find((p: any) => p.poNo === order.materialPurchasePoNo);
					if (matchingPSIR && matchingPSIR.batchNo && matchingPSIR.invoiceNo && String(matchingPSIR.invoiceNo).trim()) {
						console.log('[VendorDeptModule] ✓ Auto-backfill: Found batchNo for PO', order.materialPurchasePoNo, ':', matchingPSIR.batchNo);
						return { ...order, batchNo: matchingPSIR.batchNo };
					}
					return order;
				});
				
				return updated;
			});
		} catch (err) {
			console.error('[VendorDeptModule] Error auto-backfilling batchNo:', err);
		}
	}, [psirData]);

	// Auto-fill vendorBatchNo in form when PO changes
	useEffect(() => {
		if (newOrder.materialPurchasePoNo && (!newOrder.vendorBatchNo || !newOrder.vendorBatchNo.trim())) {
			const vsirBatchNo = getVendorBatchNoFromVSIR(newOrder.materialPurchasePoNo, vsirRecords);
			if (vsirBatchNo) {
				console.log('[VendorDept] Auto-filling vendorBatchNo from VSIR:', vsirBatchNo);
				setNewOrder(prev => ({ ...prev, vendorBatchNo: vsirBatchNo }));
			}
		}
	}, [newOrder.materialPurchasePoNo, vsirRecords]);

		// Auto-fill Material Purchase PO No from latest PO No in PurchaseModule ONLY if newOrder is blank (prevents overwriting user input)
		useEffect(() => {
			const handlePurchaseChange = () => {
				if (!purchaseOrders || purchaseOrders.length === 0) return;
				
				const parsed = purchaseOrders;
				if (Array.isArray(parsed) && parsed.length > 0) {
					const latest = parsed[parsed.length - 1];
					// Only auto-fill if newOrder is blank except for materialPurchasePoNo
					if (
						latest && latest.poNo &&
						!newOrder.orderPlaceDate &&
						!newOrder.dcNo &&
						!newOrder.vendorName &&
						(!newOrder.items || newOrder.items.length === 0)
					) {
						setNewOrder(prev => ({ ...prev, materialPurchasePoNo: latest.poNo }));
					}
				}
			};
			// Initial run
			handlePurchaseChange();
			// Listen for same-tab updates via event bus
			bus.addEventListener('purchaseOrders.updated', handlePurchaseChange as EventListener);
			return () => {
				bus.removeEventListener('purchaseOrders.updated', handlePurchaseChange as EventListener);
			};
		}, [newOrder.orderPlaceDate, newOrder.dcNo, newOrder.vendorName, newOrder.items, purchaseOrders]);

	// Always set Material Purchase PO No to latest PO No from PurchaseModule if empty
	useEffect(() => {
		if (newOrder.materialPurchasePoNo) return;
		if (!purchaseOrders || purchaseOrders.length === 0) return;
		
		const parsed = purchaseOrders;
		if (Array.isArray(parsed) && parsed.length > 0) {
			const latest = parsed[parsed.length - 1];
			if (latest && latest.poNo) {
				setNewOrder(prev => ({ ...prev, materialPurchasePoNo: latest.poNo }));
			}
		}
	}, [newOrder.materialPurchasePoNo, purchaseOrders]);

	// Always sync Material Purchase PO No with the latest PO No from PurchaseModule
	useEffect(() => {
		const handlePurchaseChange = () => {
			if (!purchaseOrders || purchaseOrders.length === 0) return;
			
			const parsed = purchaseOrders;
			if (Array.isArray(parsed) && parsed.length > 0) {
				const latest = parsed[parsed.length - 1];
				if (latest && latest.poNo) {
					setNewOrder(prev => ({ ...prev, materialPurchasePoNo: latest.poNo }));
				}
			}
		};
		// Initial run
		handlePurchaseChange();
		// Listen for changes via event bus
		bus.addEventListener('purchaseOrders.updated', handlePurchaseChange as EventListener);
		return () => {
			bus.removeEventListener('purchaseOrders.updated', handlePurchaseChange as EventListener);
		};
	}, [purchaseOrders]);

	// Helper function to generate batch number

	// When materialPurchasePoNo changes, auto-fill order-level fields (if empty)
	useEffect(() => {
		if (!newOrder.materialPurchasePoNo) {
			console.log('[VendorDeptModule][MaterialPOChange] PO No is empty, skipping');
			return;
		}
		
		const poNo = newOrder.materialPurchasePoNo;
		console.log('[VendorDeptModule][MaterialPOChange] PO No changed to:', poNo);
		
		try {
			let oaNoValue = '';
			let batchNoValue = '';
			let vendorBatchNoValue = '';
			let orderPlaceDateValue = '';
			
			// FIRST: Try to get from existing VendorDept orders
			const existingOrder = orders.find(order => order.materialPurchasePoNo === poNo);
			if (existingOrder) {
				oaNoValue = existingOrder.oaNo || '';
				batchNoValue = existingOrder.batchNo || '';
				vendorBatchNoValue = existingOrder.vendorBatchNo || '';
				orderPlaceDateValue = existingOrder.orderPlaceDate || '';
				console.log('[VendorDeptModule][MaterialPOChange] ✓ Found in existing VendorDept orders:', { oaNoValue, batchNoValue, vendorBatchNoValue, orderPlaceDateValue });
			}
			
			// SECOND: If not found in orders, try PSIR data
			if (!oaNoValue || !batchNoValue || !orderPlaceDateValue) {
				const psirDataRecord = getPSIRDataByPO(poNo, psirData);
				if (psirDataRecord) {
					if (!oaNoValue) oaNoValue = psirDataRecord.oaNo || '';
					if (!batchNoValue) batchNoValue = psirDataRecord.batchNo || '';
					if (!orderPlaceDateValue) orderPlaceDateValue = psirDataRecord.receivedDate || '';
					console.log('[VendorDeptModule][MaterialPOChange] ✓ Found in PSIR:', { oaNoValue, batchNoValue, orderPlaceDateValue });
				}
			}
			
			// THIRD: If vendorBatchNo not found, try to get from VSIR
			if (!vendorBatchNoValue) {
				vendorBatchNoValue = getVendorBatchNoFromVSIR(poNo, vsirRecords);
				if (vendorBatchNoValue) {
					console.log('[VendorDeptModule][MaterialPOChange] ✓ Fetched Vendor Batch No from VSIR:', vendorBatchNoValue);
				} else {
					console.log('[VendorDeptModule][MaterialPOChange] ✗ Vendor Batch No not found in VSIR');
				}
			}
			
			console.log('[VendorDeptModule][MaterialPOChange] Final values - Order Place Date:', orderPlaceDateValue, 'OA NO:', oaNoValue, 'Batch No:', batchNoValue);
			
			setNewOrder(prev => {
				const updated = {
					...prev,
					orderPlaceDate: orderPlaceDateValue || prev.orderPlaceDate,
					oaNo: oaNoValue || prev.oaNo,
					batchNo: batchNoValue || prev.batchNo,
					vendorBatchNo: vendorBatchNoValue || prev.vendorBatchNo,
				};
				console.log('[VendorDeptModule][MaterialPOChange] Updated newOrder state:', updated);
				return updated;
			});
		} catch (e) {
			console.error('[VendorDeptModule][MaterialPOChange] Error:', e);
		}
	}, [newOrder.materialPurchasePoNo, orders, vsirRecords, psirData]);



	// Auto-fill item fields from PSIR data (preferred) or purchaseData when PO No or Item Code changes
	useEffect(() => {
		if (!newOrder.materialPurchasePoNo || !itemInput.itemCode) return;
		console.log('[VendorDeptModule][AutoFill] PO No:', newOrder.materialPurchasePoNo, 'Item Code:', itemInput.itemCode);
		// Try PSIR data first
		let filled = false;
		if (psirData) {
			try {
				const psirs = psirData;
				for (const psir of psirs) {
					if (psir.poNo === newOrder.materialPurchasePoNo && Array.isArray(psir.items)) {
						const match = psir.items.find((it: any) => it.itemCode === itemInput.itemCode);
						console.log('[VendorDeptModule][AutoFill] PSIR match:', match);
						if (match) {
							// Do NOT auto-fill receivedQty from PSIR -- keep Received Qty manual
							setItemInput(prev => ({
								...prev,
								qty: getPurchaseQty(newOrder.materialPurchasePoNo, match.itemCode, purchaseOrders, purchaseData) || match.qtyReceived || prev.qty,
								indentStatus: (function(){ const p = getIndentStatusFromPurchase(newOrder.materialPurchasePoNo, match.itemCode || prev.itemCode, match.indentNo || psir.indentNo || prev.materialIssueNo || '', purchaseData, purchaseOrders); if (p) return p && p.toUpperCase ? p.toUpperCase() : String(p); return (prev.indentStatus || '').toUpperCase(); })(),
								okQty: match.okQty || 0,
								reworkQty: prev.reworkQty, // PSIR may not have reworkQty
								rejectedQty: match.rejectQty || 0,
								grnNo: match.grnNo || psir.grnNo || '',
							}));
							filled = true;
							break;
						}
					}
				}
			} catch (err) {
				console.error('[VendorDeptModule][AutoFill] Error parsing PSIR data:', err);
			}
		}
		// If not found in PSIR, fallback to purchaseOrders
		if (!filled && purchaseOrders) {
			try {
				const parsed = purchaseOrders;
				const norm = (v: any) => (v === undefined || v === null) ? '' : String(v).trim().toUpperCase();
				const targetPo = norm(newOrder.materialPurchasePoNo);
				const targetCode = norm(itemInput.itemCode);
				const po = parsed.find((order: any) => norm(order.poNo) === targetPo || norm(order.poNo || order.indentNo) === targetPo);
				console.log('[VendorDeptModule][AutoFill] Purchase order found (normalized):', !!po);
				if (po && Array.isArray(po.items)) {
					const match = po.items.find((it: any) => norm(it.itemCode || it.Code) === targetCode);
					console.log('[VendorDeptModule][AutoFill] Purchase item match (normalized):', match);
					if (match) {
						const inferredQty = getPurchaseQty(newOrder.materialPurchasePoNo, match.itemCode, purchaseOrders, purchaseData) || Number(match.purchaseQty ?? match.receivedQty ?? match.qty ?? 0);
						// Do NOT auto-fill receivedQty here — it must be entered manually
						setItemInput(prev => ({
							...prev,
							qty: inferredQty,
							okQty: match.okQty || 0,
							reworkQty: match.reworkQty || 0,
							rejectedQty: match.rejectedQty || 0,
							grnNo: match.grnNo || '',
						}));
					}
				}
			} catch (err) {
				console.error('[VendorDeptModule][AutoFill] Error parsing purchaseOrders:', err);
			}
		}
	}, [newOrder.materialPurchasePoNo, itemInput.itemCode, psirData, purchaseOrders, purchaseData]);


	useEffect(() => {
		console.log('[VendorDeptModule] Loading item master data from Firestore state');
		// Item master will be passed from parent or loaded separately
	}, []);

	const handleAddItem = () => {
		if (!itemInput.itemName || !itemInput.itemCode || !itemInput.materialIssueNo || itemInput.qty <= 0) return;
		const itemWithStock = { ...itemInput, plannedQty: itemInput.qty, closingStock: getClosingStock(itemInput.itemCode, itemInput.itemName) };
		setNewOrder({ ...newOrder, items: [...newOrder.items, itemWithStock] });
		setItemInput({ itemName: '', itemCode: '', materialIssueNo: '', qty: 0, plannedQty: 0, closingStock: '', indentStatus: '', receivedQty: 0, okQty: 0, reworkQty: 0, rejectedQty: 0, grnNo: '', debitNoteOrQtyReturned: '', remarks: '' });
	};

	const handleDeleteOrder = (idx: number) => {
		if (!userUid || !orders[idx]?.id) {
			alert('Error: Cannot delete order - user or order ID is missing');
			return;
		}
		
		if (!window.confirm('Are you sure you want to delete this order?')) {
			return;
		}
		
		const docId = orders[idx].id;
		deleteVendorDept(userUid, docId)
			.then(() => {
				console.log('[VendorDeptModule] ✓ Order deleted from Firebase');
				setOrders(prevOrders => prevOrders.filter((_, oIdx) => oIdx !== idx));
			})
			.catch((err) => {
				console.error('[VendorDeptModule] ✗ Error deleting order from Firebase:', err);
				alert('Error deleting order. Please try again.');
			});
	};

	const handleDeleteItem = (orderIdx: number, itemIdx: number) => {
		if (!userUid || !orders[orderIdx]?.id) {
			alert('Error: Cannot delete item - user or order ID is missing');
			return;
		}
		
		if (!window.confirm('Are you sure you want to delete this item?')) {
			return;
		}
		
		const docId = orders[orderIdx].id;
		const updatedOrder = {
			...orders[orderIdx],
			items: orders[orderIdx].items.filter((_, idx) => idx !== itemIdx)
		};
		
		// If no items left, delete the entire order
		if (updatedOrder.items.length === 0) {
			deleteVendorDept(userUid, docId)
				.then(() => {
					console.log('[VendorDeptModule] ✓ Order deleted from Firebase (all items removed)');
					setOrders(prevOrders => prevOrders.filter((_, oIdx) => oIdx !== orderIdx));
				})
				.catch((err) => {
					console.error('[VendorDeptModule] ✗ Error deleting order from Firebase:', err);
					alert('Error deleting order. Please try again.');
				});
		} else {
			// Update the order with remaining items
			const { id, ...updateData } = updatedOrder;
			updateVendorDept(userUid, docId, updateData)
				.then(() => {
					console.log('[VendorDeptModule] ✓ Item deleted and order updated in Firebase');
					setOrders(prevOrders =>
						prevOrders
							.map((o, oIdx) => oIdx === orderIdx ? updatedOrder : o)
							.filter(o => o.items.length > 0)
					);
				})
				.catch((err) => {
					console.error('[VendorDeptModule] ✗ Error updating order in Firebase:', err);
					alert('Error deleting item. Please try again.');
				});
		}
	}; 

	const handleAddOrder = () => {
		// Debug: log the new order before saving
		console.log('[VendorDeptModule] handleAddOrder newOrder:', newOrder);
		console.log('[VendorDeptModule] handleAddOrder - batchNo value:', newOrder.batchNo);
		// Ensure all required fields are filled, including OA NO and Batch No
		if (!newOrder.orderPlaceDate || !newOrder.materialPurchasePoNo || !newOrder.vendorName || newOrder.items.length === 0 || !newOrder.dcNo) {
			alert('Please fill all required fields (Order Date, PO No, Vendor, DC No, and at least one item)');
			return;
		}
		if (!newOrder.oaNo) {
			alert('OA NO not populated yet. Please wait or try selecting the PO No again.');
			return;
		}
		if (!newOrder.batchNo) {
			alert('Batch No not populated yet. Please wait or try selecting the PO No again.');
			return;
		}
		// Get vendor batch no from VSIR at save time (no auto-generation)
		let vendorBatchNo = newOrder.vendorBatchNo;
		if (!vendorBatchNo) {
			// Try to fetch from VSIR by matching PO
			console.log('[VendorDeptModule] vendorBatchNo is empty, fetching from VSIR for PO:', newOrder.materialPurchasePoNo);
			vendorBatchNo = getVendorBatchNoFromVSIR(newOrder.materialPurchasePoNo, vsirRecords);
			
			if (vendorBatchNo) {
				console.log('[VendorDeptModule] ✓ Fetched vendorBatchNo from VSIR:', vendorBatchNo);
			} else {
				console.log('[VendorDeptModule] ✗ Vendor Batch No NOT found in VSIR - leaving empty (user must create in VSIR first)');
			}
		}
		console.log('[VendorDeptModule] Final vendorBatchNo:', vendorBatchNo);
		
		// Ensure uniqueness by checking against all existing orders
		const allExistingOrders = [...orders];
		
		// Check for duplicates and increment if needed
		let counter = 0;
		while (allExistingOrders.some(o => o.vendorBatchNo === vendorBatchNo) && counter < 100) {
			counter++;
			// If duplicate found, generate next number
			const yy = String(new Date().getFullYear()).slice(-2);
			const match = vendorBatchNo.match(new RegExp(`${yy}/V(\\d+)`));
			if (match) {
				const num = parseInt(match[1], 10);
				vendorBatchNo = `${yy}/V${num + 1}`;
				console.log('[VendorDeptModule] Duplicate found, incremented to:', vendorBatchNo);
			} else {
				break;
			}
		}
		console.log('[VendorDeptModule] Final vendorBatchNo for save:', vendorBatchNo);
		const orderToSave = {
			orderPlaceDate: newOrder.orderPlaceDate,
			materialPurchasePoNo: newOrder.materialPurchasePoNo,
			oaNo: newOrder.oaNo,
			batchNo: newOrder.batchNo,
			vendorBatchNo: vendorBatchNo,
			dcNo: newOrder.dcNo,
			vendorName: newOrder.vendorName,
			items: newOrder.items,
		};
		console.log('[VendorDeptModule] Order to save with batchNo:', orderToSave);
		
		// Save to Firebase
		if (userUid) {
			addVendorDept(userUid, orderToSave)
				.then(() => {
					console.log('[VendorDeptModule] ✓ Order saved to Firebase');
					// Dispatch event for VSIR sync
					try {
						bus.dispatchEvent(new CustomEvent('vendorDept.updated', { detail: { vendorDeptData: [orderToSave] } }));
						console.log('[VendorDeptModule] Dispatched vendorDept.updated event for VSIR sync');
					} catch (err) {
						console.error('[VendorDeptModule] Error dispatching vendorDept.updated event:', err);
					}
					clearNewOrder();
				})
				.catch((err) => {
					console.error('[VendorDeptModule] ✗ Error saving order to Firebase:', err);
					alert('Error saving order. Please try again.');
				});
		} else {
			console.error('[VendorDeptModule] ✗ Cannot save order - userUid is not set');
			alert('Error: User not authenticated');
		}
	};

	const [editOrderIdx, setEditOrderIdx] = useState<number | null>(null);

	// Auto-fill Vendor Name from Purchase module when PO No changes
	useEffect(() => {
		if (!newOrder.materialPurchasePoNo) {
			// If PO is cleared, don't clear vendor name (user might want to keep it)
			return;
		}
		
		// Only auto-fill if vendor name is empty AND we're not editing (fresh add)
		if (editOrderIdx === null && !newOrder.vendorName) {
			const supplierName = getSupplierNameFromPO(newOrder.materialPurchasePoNo, purchaseOrders, purchaseData);
			if (supplierName) {
				console.log('[VendorDeptModule][VendorAutoFill] ✓ Fetched supplier name from PO:', supplierName);
				setNewOrder(prev => ({ ...prev, vendorName: supplierName }));
			} else {
				console.log('[VendorDeptModule][VendorAutoFill] ✗ Could not find supplier name for PO:', newOrder.materialPurchasePoNo);
			}
		}
	}, [newOrder.materialPurchasePoNo, editOrderIdx, newOrder.vendorName, purchaseOrders, purchaseData]);

	const handleEditOrder = (idx: number) => {
				// Deep clone to avoid direct mutation
				const orderToEdit = JSON.parse(JSON.stringify(orders[idx]));
				console.log('[DEBUG][VendorDeptModule] Editing order at idx:', idx, orderToEdit);
				
				// If the order doesn't have a vendor batch no, try to fetch from VSIR (don't generate)
				if (!orderToEdit.vendorBatchNo || orderToEdit.vendorBatchNo.trim() === '') {
					const fetchedFromVSIR = getVendorBatchNoFromVSIR(orderToEdit.materialPurchasePoNo, vsirRecords);
					if (fetchedFromVSIR) {
						console.log('[VendorDeptModule] ✓ Loaded vendor batch no from VSIR:', fetchedFromVSIR);
						orderToEdit.vendorBatchNo = fetchedFromVSIR;
					} else {
						console.log('[VendorDeptModule] ✗ Vendor Batch No not found in VSIR - will remain empty');
					}
				}
				
				setNewOrder(orderToEdit);
				// Reset itemInput when editing order - don't prefill okQty and qty fields
				setItemInput({
					itemName: '',
					itemCode: '',
					materialIssueNo: '',
					qty: 0,
					closingStock: '',
					indentStatus: '',
					receivedQty: 0,
					okQty: 0,
					reworkQty: 0,
					rejectedQty: 0,
					grnNo: '',
					debitNoteOrQtyReturned: '',
					remarks: '',
				});
				setEditOrderIdx(idx);
			};
	const handleUpdateOrder = () => {
		if (editOrderIdx === null) return;
		console.log('[DEBUG][VendorDeptModule] Saving newOrder at idx:', editOrderIdx, newOrder);
		console.log('[DEBUG][VendorDeptModule] batchNo value:', newOrder.batchNo);

		const updated = orders.map((order, idx) => idx === editOrderIdx ? newOrder : order);
		
		// Update to Firebase
		if (userUid && orders[editOrderIdx]?.id) {
			const docId = orders[editOrderIdx].id;
			// Prepare update data (remove id field since Firebase doesn't need it)
			const { id, ...updateData } = newOrder;
			updateVendorDept(userUid, docId, updateData)
				.then(() => {
					console.log('[VendorDeptModule] ✓ Order updated in Firebase');
					// Dispatch event so other modules can sync
					try {
						bus.dispatchEvent(new CustomEvent('vendorDept.updated', { detail: { vendorDeptData: updated } }));
						console.log('[VendorDeptModule] Dispatched vendorDept.updated event');
					} catch (err) {
						console.error('[VendorDeptModule] Error dispatching vendorDept.updated event:', err);
					}
					clearNewOrder();
					setEditOrderIdx(null);
				})
				.catch((err) => {
					console.error('[VendorDeptModule] ✗ Error updating order in Firebase:', err);
					alert('Error updating order. Please try again.');
				});
		} else {
			console.error('[VendorDeptModule] ✗ Cannot update order - userUid or docId is missing');
			alert('Error: User not authenticated or order ID is missing');
		}
	};

	const handleSaveItem = () => {
				if (editIdx) {
					// If editing an item in newOrder.items (pre-save table), update it in newOrder.items
					setNewOrder(prev => ({
						...prev,
						items: prev.items.map((item, iIdx) => iIdx === editIdx.itemIdx ? { ...itemInput, plannedQty: itemInput.qty, closingStock: getClosingStock(itemInput.itemCode, itemInput.itemName) } : item)
					}));
					setEditIdx(null);
					setItemInput({ itemName: '', itemCode: '', materialIssueNo: '', qty: 0, plannedQty: 0, closingStock: '', indentStatus: '', receivedQty: 0, okQty: 0, reworkQty: 0, rejectedQty: 0, grnNo: '', debitNoteOrQtyReturned: '', remarks: '' });
				} else {
					handleAddItem();
				}
	};

	// Debug: Log PO list and newOrder.materialPurchasePoNo on every render
	React.useEffect(() => {
		console.log('[VendorDeptModule] purchasePOs:', purchasePOs);
		console.log('[VendorDeptModule] newOrder.materialPurchasePoNo:', newOrder.materialPurchasePoNo);
	}, [purchasePOs, newOrder.materialPurchasePoNo]);

	// Debug: Log DC No and newOrder state on every render
	useEffect(() => {
		console.log('[VendorDeptModule] newOrder.dcNo:', newOrder.dcNo);
		console.log('[VendorDeptModule] newOrder:', newOrder);
		console.log('[VendorDeptModule] orders:', orders);
	}, [newOrder, orders]);

	// Auto-import: Create VendorDept orders from PurchaseOrders (Firebase only - NO localStorage)
	React.useEffect(() => {
		if (!userUid || !Array.isArray(purchaseOrders) || purchaseOrders.length === 0) {
			return; // Wait for userUid and purchase data
		}

		// Group purchase entries by poNo
		const poGroups: { [poNo: string]: any[] } = {};
		purchaseOrders.forEach((entry: any) => {
			if (!entry.poNo) return;
			const normalizedPoNo = String(entry.poNo).trim().toUpperCase();
			if (!poGroups[normalizedPoNo]) poGroups[normalizedPoNo] = [];
			poGroups[normalizedPoNo].push(entry);
		});

		// Check which POs already have orders (normalize for case-insensitive comparison)
		const existingPOs = new Set<string>(
			orders.map(order => String(order.materialPurchasePoNo).trim().toUpperCase())
		);

		// For each PO not yet imported, create a VendorDept order
		Object.entries(poGroups).forEach(([normalizedPoNo, group]) => {
			if (existingPOs.has(normalizedPoNo)) {
				return; // Already exists
			}

			const first = group[0];
			const poNo = first.poNo;

			// Find matching PSIR and VSIR records from state (not localStorage)
			let batchNo = '';
			if (Array.isArray(psirData)) {
				const matchingPSIR = psirData.find((p: any) => 
					String(p.poNo).trim().toUpperCase() === normalizedPoNo
				);
				if (matchingPSIR?.batchNo) {
					batchNo = matchingPSIR.batchNo;
				}
			}

			let vendorBatchNo = '';
			if (Array.isArray(vsirRecords)) {
				const matchingVSIR = vsirRecords.find((v: any) => 
					String(v.poNo).trim().toUpperCase() === normalizedPoNo
				);
				if (matchingVSIR?.vendorBatchNo) {
					vendorBatchNo = matchingVSIR.vendorBatchNo;
				}
			}

			// Map items for this order
			const items = group.map((item: any) => ({
				itemName: item.itemName || item.model || '',
				itemCode: item.itemCode || '',
				materialIssueNo: '',
				qty: item.qty || 0,
				indentStatus: (item.indentStatus || '').toUpperCase(),
				receivedQty: 0,
				okQty: item.okQty || 0,
				reworkQty: item.reworkQty || 0,
				rejectedQty: item.rejectedQty || 0,
				grnNo: item.grnNo || '',
				debitNoteOrQtyReturned: item.debitNoteOrQtyReturned || '',
				remarks: item.remarks || '',
			}));

			// Create and save the order to Firebase
			const newOrder: VendorDeptOrder = {
				orderPlaceDate: first?.orderPlaceDate || '',
				materialPurchasePoNo: poNo,
				oaNo: first?.oaNo || '',
				batchNo,
				vendorBatchNo,
				dcNo: '',
				vendorName: '', // Requires manual entry
				items,
			};

			addVendorDept(userUid, newOrder)
				.then(() => {
					console.debug('[VendorDeptModule][AutoImport] ✅ Order auto-imported to Firebase for PO:', poNo);
				})
				.catch((error) => {
					console.error('[VendorDeptModule][AutoImport] ❌ Error saving order for PO', poNo, ':', error);
				});
		});
	}, [purchaseOrders, psirData, vsirRecords, orders, userUid]);

	// Regenerate vendor batch nos for existing orders that don't have them
	const regenerateVendorBatchNos = () => {
		const rawData = localStorage.getItem('vendorDeptData');
		if (!rawData) return;
		
		try {
			const allOrders = JSON.parse(rawData);
			let needsUpdate = false;
			
			const updated = allOrders.map((order: any, idx: number) => {
				if (!order.vendorBatchNo || order.vendorBatchNo.trim() === '') {
					needsUpdate = true;
					// Generate unique vendor batch no
					const yy = String(new Date().getFullYear()).slice(-2);
					let maxNum = 0;
					
					// Find max number already used
					allOrders.forEach((o: any) => {
						if (o.vendorBatchNo && typeof o.vendorBatchNo === 'string') {
							const match = o.vendorBatchNo.match(new RegExp(`${yy}/V(\\d+)`));
							if (match) {
								const num = parseInt(match[1], 10);
								if (!isNaN(num)) maxNum = Math.max(maxNum, num);
							}
						}
					});
					
					// Make sure we don't duplicate numbers already in this batch
					let newNum = maxNum + idx + 1;
					const newVendorBatchNo = `${yy}/V${newNum}`;
					console.log('[VendorDeptModule] Regenerating vendorBatchNo for order', idx, ':', newVendorBatchNo);
					return { ...order, vendorBatchNo: newVendorBatchNo };
				}
				return order;
			});
			
			if (needsUpdate) {
				console.log('[VendorDeptModule] Updated orders with vendorBatchNos:', updated);
				localStorage.setItem('vendorDeptData', JSON.stringify(updated));
				setOrders(updated);
				alert('✅ Vendor Batch Nos regenerated for all orders!');
			} else {
				console.log('[VendorDeptModule] All orders already have vendorBatchNos');
				alert('✅ All orders already have Vendor Batch Nos');
			}
		} catch (err) {
			console.error('[VendorDeptModule] Error regenerating vendor batch nos:', err);
			alert('❌ Error regenerating vendor batch nos');
		}
	};

	// Sync Batch No from PSIR to all existing orders
	const syncBatchNoFromPSIR = () => {
		console.log('[VendorDeptModule] Syncing Batch No from PSIR to all orders');
		try {
			const psirDataRaw = localStorage.getItem('psirData');
			if (!psirDataRaw) {
				alert('❌ No PSIR data found');
				return;
			}
			
			const psirRecords = JSON.parse(psirDataRaw);
			const allOrdersRaw = localStorage.getItem('vendorDeptData');
			if (!allOrdersRaw) {
				alert('❌ No Vendor Dept orders found');
				return;
			}
			
			const allOrders = JSON.parse(allOrdersRaw);
			let updated = 0;
			
			const syncedOrders = allOrders.map((order: any) => {
				// Find matching PSIR record by PO number
				const matchingPSIR = psirRecords.find((p: any) => p.poNo === order.materialPurchasePoNo);
				if (matchingPSIR && matchingPSIR.batchNo && !order.batchNo) {
					console.log('[VendorDeptModule] ✓ Syncing batchNo for PO', order.materialPurchasePoNo, ':', matchingPSIR.batchNo);
					updated++;
					return { ...order, batchNo: matchingPSIR.batchNo };
				}
				return order;
			});
			
			localStorage.setItem('vendorDeptData', JSON.stringify(syncedOrders));
			setOrders(syncedOrders);
			bus.dispatchEvent(new CustomEvent('vendorDept.updated', { detail: { vendorDeptData: syncedOrders } }));
			
			if (updated > 0) {
				console.log('[VendorDeptModule] Synced Batch No for', updated, 'orders');
				alert(`✅ Synced Batch No for ${updated} order(s)`);
			} else {
				alert('✅ All orders already have Batch No or no matching PSIR data');
			}
		} catch (err) {
			console.error('[VendorDeptModule] Error syncing Batch No from PSIR:', err);
			alert('❌ Error syncing Batch No: ' + String(err));
		}
	};

	// Always sync orders state with localStorage after auto-adding POs
	React.useEffect(() => {
		const savedData = localStorage.getItem('vendorDeptData');
		if (savedData) {
			setOrders(JSON.parse(savedData));
		}

		// When PurchaseModule updates, attempt a non-destructive sync to fill empty qtys
		const handlePurchaseUpdate = () => {
			console.log('[VendorDeptModule] Detected purchaseOrders update, running non-destructive sync');
			syncEmptyVendorDeptQty();
		};

		// When VSIR updates, sync vendorBatchNo
const handleVSIRUpdate = (event?: any) => {
		console.log('[VendorDeptModule] VSIR updated event received, syncing vendorBatchNo');
		console.log('[VendorDeptModule] Event detail records:', event?.detail?.records);
		
		// Get VSIR records directly from localStorage for diagnostic
		const vsirRaw = localStorage.getItem('vsri-records');
		if (vsirRaw) {
			const vsirRecords = JSON.parse(vsirRaw);
			console.log('[VendorDeptModule] VSIR records from localStorage:', vsirRecords.map((r: any) => ({ poNo: r.poNo, vendorBatchNo: r.vendorBatchNo, id: r.id })));
		}
		
		setOrders(prevOrders => {
			console.log('[VendorDeptModule] Current VendorDept orders:', prevOrders.map(o => ({ poNo: o.materialPurchasePoNo, vendorBatchNo: o.vendorBatchNo })));
			const updated = prevOrders.map(order => {
				if (!order.vendorBatchNo || !order.vendorBatchNo.trim()) {
					const fetched = getVendorBatchNoFromVSIR(order.materialPurchasePoNo, vsirRecords);
					console.log('[VendorDeptModule] Attempting to fetch for PO:', order.materialPurchasePoNo, '-> Result:', fetched);
					if (fetched) {
						console.log('[VendorDept] Synced vendorBatchNo for PO', order.materialPurchasePoNo, ':', fetched);
						return { ...order, vendorBatchNo: fetched };
					}
				}
				return order;
			});
			// Persist synced data back to localStorage
			console.log('[VendorDeptModule] Final updated orders:', updated.map(o => ({ poNo: o.materialPurchasePoNo, vendorBatchNo: o.vendorBatchNo })));
				localStorage.setItem('vendorDeptData', JSON.stringify(updated));
				return updated;
			});
		};

		window.addEventListener('storage', handlePurchaseUpdate);
		bus.addEventListener('purchaseOrders.updated', handlePurchaseUpdate as EventListener);
		bus.addEventListener('vsir.updated', handleVSIRUpdate as EventListener);
		
		return () => {
			window.removeEventListener('storage', handlePurchaseUpdate);
			bus.removeEventListener('purchaseOrders.updated', handlePurchaseUpdate as EventListener);
			bus.removeEventListener('vsir.updated', handleVSIRUpdate as EventListener);
		};
	}, [purchasePOs]);

	// Debug: Log orders state before rendering table
	React.useEffect(() => {
		console.log('[VendorDeptModule] orders state before table (full):', JSON.stringify(orders, null, 2));
	}, [orders]);

	// When PSIR data is updated, refresh the form's batchNo if PO is selected
	useEffect(() => {
		const handlePSIRUpdate = () => {
			console.log('[VendorDeptModule] PSIR data updated, refreshing batchNo for current PO:', newOrder.materialPurchasePoNo);
			if (!newOrder.materialPurchasePoNo) return;
			
			try {
				const psirDataRaw = localStorage.getItem('psirData');
				if (!psirDataRaw) return;
				
				const psirs = JSON.parse(psirDataRaw);
				const matchingPSIR = psirs.find((p: any) => p.poNo === newOrder.materialPurchasePoNo);
				
				if (matchingPSIR && matchingPSIR.invoiceNo && String(matchingPSIR.invoiceNo).trim() && matchingPSIR.batchNo) {
					console.log('[VendorDeptModule] ✓ PSIR update: Found invoiceNo and batchNo, updating form');
					setNewOrder(prev => ({
						...prev,
						oaNo: matchingPSIR.oaNo || prev.oaNo,
						batchNo: matchingPSIR.batchNo || prev.batchNo,
					}));
				}
			} catch (err) {
				console.error('[VendorDeptModule] Error handling PSIR update:', err);
			}
		};
		
		bus.addEventListener('psirData.updated', handlePSIRUpdate as EventListener);
		
		return () => {
			bus.removeEventListener('psirData.updated', handlePSIRUpdate as EventListener);
		};
	}, [newOrder.materialPurchasePoNo]);

	// Auto-fill vendorBatchNo from VSIR when PO No changes (don't generate - let save handle that)
	useEffect(() => {
		if (newOrder.materialPurchasePoNo) {
			console.log('[VendorDept] ========== AUTO-FILL CHECK ==========');
			const vendorBatchNo = getVendorBatchNoFromVSIR(newOrder.materialPurchasePoNo);
			console.log('[VendorDept] Auto-fill vendorBatchNo for PO:', newOrder.materialPurchasePoNo, 'Result from VSIR:', vendorBatchNo);
			
			if (vendorBatchNo) {
				console.log('[VendorDept] ✓ Found in VSIR, setting vendorBatchNo:', vendorBatchNo);
				setNewOrder(prev => ({ ...prev, vendorBatchNo }));
				console.log('[VendorDept] vendorBatchNo filled from VSIR:', vendorBatchNo);
			} else {
				// If not found in VSIR, check if there's an existing order with this PO
				const existingOrder = orders.find(o => o.materialPurchasePoNo === newOrder.materialPurchasePoNo);
				if (existingOrder?.vendorBatchNo) {
					console.log('[VendorDept] ✓ Found in existing orders, using vendorBatchNo:', existingOrder.vendorBatchNo);
					setNewOrder(prev => ({ ...prev, vendorBatchNo: existingOrder.vendorBatchNo }));
				} else {
					// If not found anywhere, set to empty and let save time logic generate unique one
					console.log('[VendorDept] ✗ No VSIR data or existing order found, will generate unique number at save time');
					setNewOrder(prev => ({ ...prev, vendorBatchNo: '' }));
				}
			}
			console.log('[VendorDept] ====================================');
		}
	}, [newOrder.materialPurchasePoNo, orders]);

	// Listen to VSIR updates and refetch vendorBatchNo if PO matches
	useEffect(() => {
		const handleVsirRecordsSync = () => {
			if (newOrder.materialPurchasePoNo) {
				console.log('[VendorDept] VSIR records synced event received, refetching vendorBatchNo');
				const vendorBatchNo = getVendorBatchNoFromVSIR(newOrder.materialPurchasePoNo);
				if (vendorBatchNo && vendorBatchNo !== newOrder.vendorBatchNo) {
					console.log('[VendorDept] ✓ Updating vendorBatchNo from VSIR sync:', vendorBatchNo);
					setNewOrder(prev => ({ ...prev, vendorBatchNo }));
				}
			}
		};
		
		bus.addEventListener('vsir.records.synced', handleVsirRecordsSync as EventListener);
		bus.addEventListener('vsir.updated', handleVsirRecordsSync as EventListener);
		
		return () => {
			bus.removeEventListener('vsir.records.synced', handleVsirRecordsSync as EventListener);
			bus.removeEventListener('vsir.updated', handleVsirRecordsSync as EventListener);
		};
	}, [newOrder.materialPurchasePoNo, newOrder.vendorBatchNo]);

	// When PSIR data is updated, sync batchNo to existing orders
	useEffect(() => {
		const handlePSIRUpdate = () => {
			console.log('[VendorDeptModule] PSIR data updated, syncing batchNo to orders');
			const psirDataRaw = localStorage.getItem('psirData');
			if (!psirDataRaw) return;
			
			try {
				const psirRecords = JSON.parse(psirDataRaw);
				setOrders(prevOrders => {
					const updated = prevOrders.map(order => {
						// Find matching PSIR record by PO number
						const matchingPSIR = psirRecords.find((p: any) => p.poNo === order.materialPurchasePoNo);
						if (matchingPSIR && matchingPSIR.batchNo && !order.batchNo) {
							// Only update if order doesn't have batchNo but PSIR does
							console.log('[VendorDeptModule] ✓ Syncing batchNo from PSIR for PO', order.materialPurchasePoNo, ':', matchingPSIR.batchNo);
							return { ...order, batchNo: matchingPSIR.batchNo };
						}
						return order;
					});
					
					// Check if any changes were made
					const changed = updated.some((o, i) => o.batchNo !== prevOrders[i].batchNo);
					if (changed) {
						console.log('[VendorDeptModule] Batch No synced from PSIR, saving to localStorage');
						localStorage.setItem('vendorDeptData', JSON.stringify(updated));
						bus.dispatchEvent(new CustomEvent('vendorDept.updated', { detail: { vendorDeptData: updated } }));
					}
					return updated;
				});
			} catch (err) {
				console.error('[VendorDeptModule] Error syncing PSIR batchNo:', err);
			}
		};
		
		bus.addEventListener('psirData.updated', handlePSIRUpdate as EventListener);
		
		return () => {
			bus.removeEventListener('psirData.updated', handlePSIRUpdate as EventListener);
		};
	}, []);

	// When clearing the form after add/update, also set next DC No
	const clearNewOrder = () => {
		setNewOrder({
			orderPlaceDate: '',
			materialPurchasePoNo: '',
			oaNo: '',
			batchNo: '',
			vendorBatchNo: '',
			dcNo: '',
			vendorName: '', // Always default to empty string
			items: [],
		});
		setItemInput({ itemName: '', itemCode: '', materialIssueNo: '', qty: 0, closingStock: '', indentStatus: '', receivedQty: 0, okQty: 0, reworkQty: 0, rejectedQty: 0, grnNo: '', debitNoteOrQtyReturned: '', remarks: '' });
	};

	// Build a human-friendly debug report indicating where values come from
	const buildDebugReport = () => {
		const raw = localStorage.getItem('vendorDeptData');
		const psirRaw = localStorage.getItem('psirData');
		const purchaseDataRaw = localStorage.getItem('purchaseData');
		const vendorData = raw ? JSON.parse(raw) as VendorDeptOrder[] : [];
		// const pos = purchaseOrdersRaw ? JSON.parse(purchaseOrdersRaw) : []; // unused

		const psirs = psirRaw ? JSON.parse(psirRaw) : [];
		const pd = purchaseDataRaw ? JSON.parse(purchaseDataRaw) : [];
		const norm = (v: any) => (v === undefined || v === null) ? '' : String(v).trim().toUpperCase();
		const report: any[] = [];
		vendorData.forEach((order, oIdx) => {
			(order.items || []).forEach((it, iIdx) => {
				const poNo = order.materialPurchasePoNo;
				const code = it.itemCode;
				const purchaseQty = getPurchaseQty(poNo, code) || 0;
				let psirQty = 0;
				for (const psir of psirs) {
					if (norm(psir.poNo) === norm(poNo) && Array.isArray(psir.items)) {
						const m = psir.items.find((x: any) => norm(x.itemCode) === norm(code));
						if (m) { psirQty = Number(m.qtyReceived || 0); break; }
					}
				}
				let inferred = 'manual';
				let matchedSource: string | null = null;
				let matchedDetails: any = null;
				if (purchaseQty > 0 && Number(it.qty) === purchaseQty) { inferred = 'purchase'; matchedSource = 'purchase'; matchedDetails = { purchaseQty }; }
				else if (psirQty > 0 && Number(it.receivedQty) === psirQty) { inferred = 'psir'; matchedSource = 'psir'; matchedDetails = { psirQty }; }
				else if (!it.qty || Number(it.qty) === 0) { inferred = 'empty'; }
				const pdMatchEntry = (pd || []).find((x: any) => (norm(x.poNo) === norm(poNo) || norm(x.indentNo) === norm(poNo)) && norm(x.itemCode || x.Code) === norm(code));
				const poMatch = (() => {
					try {
						const purchaseOrdersRaw = localStorage.getItem('purchaseOrders');
						if (!purchaseOrdersRaw) return null;
						const pos = JSON.parse(purchaseOrdersRaw);
						if (!Array.isArray(pos)) return null;
						const poEntry = pos.find((p: any) => norm(p.poNo) === norm(poNo) || norm(p.poNo || p.indentNo) === norm(poNo));
						if (!poEntry) return null;
						if (Array.isArray(poEntry.items)) return poEntry.items.find((it2: any) => norm(it2.itemCode || it2.Code) === norm(code)) || null;
						return (norm(poEntry.itemCode || poEntry.Code) === norm(code)) ? poEntry : null;
					} catch { return null; }
				})();
				report.push({ po: poNo, itemCode: code, currentQty: it.qty, purchaseQty, psirQty, pdMatch: !!pdMatchEntry, poMatch, pdMatchEntry, inferredSource: inferred, matchedSource, matchedDetails, orderIdx: oIdx, itemIdx: iIdx });
			});
		});
		setDebugReport(report);
		console.log('[VendorDeptModule][DebugReport]', report);
		return report;
	};

	// Stock debug panel state & builder
	const [stockDebugOpen, setStockDebugOpen] = useState(false);
	const [stockDebugReport, setStockDebugReport] = useState<any[]>([]);

	const buildStockDebugReport = () => {
		const stockRaw = localStorage.getItem('stock-records');
		const stocks = stockRaw ? JSON.parse(stockRaw) : [];
		const norm = (v: any) => (v === undefined || v === null) ? '' : String(v).trim().toUpperCase();
		const alpha = (v: any) => norm(v).replace(/[^A-Z0-9]/g, '');
		const report: any[] = [];
		(orders || []).forEach((order, oIdx) => {
			(order.items || []).forEach((it, iIdx) => {
				const lookupVals = [it.itemCode, it.itemName].filter(Boolean).join(' ');
				const target = norm(lookupVals);
				const targetAlpha = alpha(lookupVals);
				let matchedRecord: any = null;
				let matchedBy = 'none';
				// exact alpha/norm match
				matchedRecord = stocks.find((s: any) => {
					const candidates = [s.itemCode, s.ItemCode, s.code, s.Code, s.item_code, s.itemName, s.ItemName, s.name, s.Name, s.sku, s.SKU];
					return candidates.some(c => alpha(c) === targetAlpha || norm(c) === target);
				});
				if (matchedRecord) matchedBy = 'exact';
				else {
					matchedRecord = stocks.find((s: any) => {
						return Object.values(s).some((v: any) => {
							try {
							const a = alpha(v);
							const n = norm(v);
							return a.includes(targetAlpha) || targetAlpha.includes(a) || n.includes(target) || target.includes(n);
						} catch { return false; }
						});
					});
					if (matchedRecord) matchedBy = 'contains';
				}
				// If multiple matches potentially apply, pick the best candidate deterministically
			if (matchedRecord) {
				const combinedMatches = stocks.filter((s: any) => {
					const candidates = [s.itemCode, s.ItemCode, s.code, s.Code, s.item_code, s.itemName, s.ItemName, s.name, s.Name, s.sku, s.SKU];
					const exact = candidates.some(c => alpha(c) === targetAlpha || norm(c) === target);
					if (exact) return true;
					try {
						return Object.values(s).some((v: any) => {
							const a = alpha(v);
							const n = norm(v);
							return a.includes(targetAlpha) || targetAlpha.includes(a) || n.includes(target) || target.includes(n);
						});
					} catch { return false; }
				});
				if (combinedMatches.length > 1) {
					matchedRecord = chooseBestStock(combinedMatches);
				}
			}
			const closingKey = matchedRecord ? findNumericField(matchedRecord, ['closingStock','closing_stock','ClosingStock','closing','closingQty','closing_qty','Closing','closing stock','Closing Stock','closingstock','closingStockQty','closing_stock_qty','ClosingStockQty','closingstockqty']) : null;
			const closingStock = closingKey ? closingKey.value : null;
				const stockQty = matchedRecord ? getNumericField(matchedRecord, ['stockQty','stock_qty','stock','StockQty','currentStock']) : null;
				const purchaseActualQtyInStore = matchedRecord ? getNumericField(matchedRecord, ['purchaseActualQtyInStore','purchase_actual_qty_in_store','purchaseActualQty','purchase_actual_qty','purchaseActualQtyInStore']) : null;
				const computed = (closingStock !== null ? closingStock : ((stockQty || 0) + (purchaseActualQtyInStore || 0)));
				report.push({ po: order.materialPurchasePoNo, orderIdx: oIdx, itemIdx: iIdx, itemCode: it.itemCode, itemName: it.itemName, matched: !!matchedRecord, matchedBy, matchedRecord, closingStock, closingKey: closingKey ? closingKey.key : null, closingRaw: closingKey ? closingKey.raw : null, stockQty, purchaseActualQtyInStore, computed });
			});
		});
		setStockDebugReport(report);
		console.log('[VendorDeptModule][StockDebug]', report);
		return report;
	};

	// Non-destructive sync: only fill empty qty values
	const syncEmptyVendorDeptQty = () => {
		if (orders.length === 0) return;
		let changed = false;
		const updated = orders.map(order => ({
			...order,
			items: (order.items || []).map(it => {
				const p = getPurchaseQty(order.materialPurchasePoNo, it.itemCode, purchaseOrders, purchaseData) || 0;
				if ((!it.qty || Number(it.qty) === 0) && p > 0) {
					changed = true;
					return { ...it, qty: p };
				}
				return it;
			})
		}));
		if (changed) {
			setOrders(updated);
			console.log('[VendorDeptModule] Sync Empty Qty applied');
		} else {
			console.log('[VendorDeptModule] No empty qty items to sync');
		}
	};

	// Force sync: overwrite all qty where purchase data exists
	const forceVendorDeptSync = () => {
		if (orders.length === 0) return;
		let changed = false;
		const updated = orders.map(order => ({
			...order,
			items: (order.items || []).map(it => {
				const p = getPurchaseQty(order.materialPurchasePoNo, it.itemCode, purchaseOrders, purchaseData) || 0;
				if (p > 0 && Number(it.qty) !== p) {
					changed = true;
					return { ...it, qty: p };
				}
				return it;
			})
		}));
		if (changed) {
			setOrders(updated);
			console.log('[VendorDeptModule] Force Sync applied');
		} else {
			console.log('[VendorDeptModule] No items required force sync');
		}
	};

	// CRITICAL FIX: Remove any code that writes to purchaseOrders
	// This module should ONLY read from purchaseOrders and write to vendorDeptData

	// Return the stock total for an item. Prefer `closingStock` if present in stock-records.
	// Accepts itemCode or itemName (fallback) to improve matching when one is missing.
	const getStockTotal = (itemCode?: string, itemName?: string): number => {
		try {
			if (!itemCode && !itemName) return 0;
			const lookup = (itemCode || itemName || '');
			const norm = (v: any) => (v === undefined || v === null) ? '' : String(v).trim().toUpperCase();
			const alpha = (v: any) => norm(v).replace(/[^A-Z0-9]/g, ''); // remove punctuation/spaces for robust matching
			const target = norm(lookup);
			const targetAlpha = alpha(lookup);
			const stockRaw = localStorage.getItem('stock-records');
			const stocks = stockRaw ? JSON.parse(stockRaw) : [];
			if (!Array.isArray(stocks)) return 0;

			// Try strict matches before fuzzy match: prefer exact code, then exact name, then exact normalized, then contains
			let stock: any = null;
			const codeNorm = norm(itemCode || '');
			const nameNorm = norm(itemName || '');
			if (codeNorm) {
				const matches = stocks.filter((s: any) => { try { return norm(s.itemCode || s.ItemCode || s.code || s.Code || s.item_code) === codeNorm; } catch { return false; } });
				if (matches.length > 0) { stock = chooseBestStock(matches); if (stock) console.debug('[VendorDeptModule] getStockTotal code-exact match', codeNorm, stock); }
			}
			if (!stock && nameNorm) {
				const matches = stocks.filter((s: any) => { try { return norm(s.itemName || s.ItemName || s.name || s.Name) === nameNorm; } catch { return false; } });
				if (matches.length > 0) { stock = chooseBestStock(matches); if (stock) console.debug('[VendorDeptModule] getStockTotal name-exact match', nameNorm, stock); }
			}
			if (!stock) {
				const matches = stocks.filter((s: any) => {
					const candidates = [s.itemCode, s.ItemCode, s.code, s.Code, s.item_code, s.itemName, s.ItemName, s.name, s.Name, s.sku, s.SKU];
					return candidates.some(c => alpha(c) === targetAlpha || norm(c) === target);
				});
				if (matches.length > 0) { stock = chooseBestStock(matches); if (stock) console.debug('[VendorDeptModule] getStockTotal exact normalized match', target, stock); }
			}
			if (!stock) {
				const matches = stocks.filter((s: any) => {
					return Object.values(s).some((v: any) => {
						try {
							const a = alpha(v);
							const n = norm(v);
							return a.includes(targetAlpha) || targetAlpha.includes(a) || n.includes(target) || target.includes(n);
						} catch { return false; }
					});
				});
				if (matches.length > 0) { stock = chooseBestStock(matches); if (stock) console.debug('[VendorDeptModule] getStockTotal contains match', target, stock); }
			}
        if (!stock) {
            console.debug('[VendorDeptModule] getStockTotal: no matching stock for', itemCode);
            return 0;
        }
			// Helper to pick numeric fields by common key names

			// Prefer closing stock using common possible field names
			const closingStock = getNumericField(stock, ['closingStock', 'closing_stock', 'ClosingStock', 'closing', 'closingQty', 'closing_qty', 'Closing','closing stock','Closing Stock','closingstock','closingStockQty','closing_stock_qty','ClosingStockQty','closingstockqty']);
			if (closingStock !== null) return closingStock;

			const stockQty = getNumericField(stock, ['stockQty', 'stock_qty', 'stock', 'StockQty', 'currentStock']) || 0;
			const purchaseActualQtyInStore = getNumericField(stock, ['purchaseActualQtyInStore', 'purchase_actual_qty_in_store', 'purchaseActualQty', 'purchase_actual_qty', 'purchaseActualQtyInStore']) || 0;
			const sQty = (stockQty || 0);
			const pQty = (purchaseActualQtyInStore || 0);
			return sQty + pQty;
		} catch (err) {
			console.error('[VendorDeptModule] getStockTotal error', err);
			return 0;
		}
	};
	void getStockTotal;

	// Return the Closing Stock (or computed fallback) for the matched stock record, using the same logic as the stock debug
	const getClosingStock = (itemCode?: string, itemName?: string): number | string => {
		try {
			if (!itemCode && !itemName) return '';
			// Use combined lookup (code + name) to match like buildStockDebugReport
			const lookup = [itemCode, itemName].filter(Boolean).join(' ');
			const norm = (v: any) => (v === undefined || v === null) ? '' : String(v).trim().toUpperCase();
			const alpha = (v: any) => norm(v).replace(/[^A-Z0-9]/g, '');
			const target = norm(lookup);
			const targetAlpha = alpha(lookup);
			const stockRaw = localStorage.getItem('stock-records');
			const stocks = stockRaw ? JSON.parse(stockRaw) : [];
			if (!Array.isArray(stocks)) return '';

			let matchedRecord: any = null;
			let matchedBy = 'none';
			void matchedBy;
			const codeNorm = norm(itemCode || '');
			const nameNorm = norm(itemName || '');
// Prefer exact itemCode match (choose best)
		if (codeNorm && !matchedRecord) {
			const matches = stocks.filter((s: any) => { try { return norm(s.itemCode || s.ItemCode || s.code || s.Code || s.item_code) === codeNorm; } catch { return false; } });
			if (matches.length > 0) { matchedRecord = chooseBestStock(matches); if (matchedRecord) matchedBy = 'code-exact'; }
		}
		// Prefer exact itemName match (choose best)
		if (nameNorm && !matchedRecord) {
			const matches = stocks.filter((s: any) => { try { return norm(s.itemName || s.ItemName || s.name || s.Name) === nameNorm; } catch { return false; } });
			if (matches.length > 0) { matchedRecord = chooseBestStock(matches); if (matchedRecord) matchedBy = 'name-exact'; }
		}
		// exact alpha/norm match first (choose best)
		{
			const matches = stocks.filter((s: any) => {
				const candidates = [s.itemCode, s.ItemCode, s.code, s.Code, s.item_code, s.itemName, s.ItemName, s.name, s.Name, s.sku, s.SKU];
				return candidates.some(c => alpha(c) === targetAlpha || norm(c) === target);
			});
			if (matches.length > 0) { matchedRecord = chooseBestStock(matches); if (matchedRecord) matchedBy = 'exact'; }
		}
		// fallback to contains
		if (!matchedRecord) {
			const matches = stocks.filter((s: any) => {
				return Object.values(s).some((v: any) => {
					try {
						const a = alpha(v);
						const n = norm(v);
						return a.includes(targetAlpha) || targetAlpha.includes(a) || n.includes(target) || target.includes(n);
					} catch { return false; }
				});
			});
			if (matches.length > 0) { matchedRecord = chooseBestStock(matches); if (matchedRecord) matchedBy = 'contains'; }
			}

			if (!matchedRecord) return '';


			const closingKey = findNumericField(matchedRecord, ['closingStock', 'closing_stock', 'ClosingStock', 'closing', 'closingQty', 'closing_qty', 'Closing','closing stock','Closing Stock','closingstock','closingStockQty','closing_stock_qty','ClosingStockQty','closingstockqty']);
			const closingStock = closingKey ? closingKey.value : null;
			const stockQty = getNumericField(matchedRecord, ['stockQty', 'stock_qty', 'stock', 'StockQty', 'currentStock']) || 0;
			const purchaseActualQtyInStore = getNumericField(matchedRecord, ['purchaseActualQtyInStore', 'purchase_actual_qty_in_store', 'purchaseActualQty', 'purchase_actual_qty', 'purchaseActualQtyInStore']) || 0;
			const computed = (closingStock !== null ? closingStock : (stockQty + purchaseActualQtyInStore));
			return computed;
		} catch (err) {
			console.error('[VendorDeptModule] getClosingStock error', err);
			return '';
		}
	};

	return (
		<div>
			<div>
				<h2>Vendor Dept Module</h2>
				<div style={{ marginBottom: 16, display: 'flex', gap: 8, background: '#ffffcc', padding: 12, borderRadius: 4, border: '1px solid #ffcc00' }}>
					<button onClick={() => {
						const poNo = newOrder.materialPurchasePoNo;
						
						// Check purchase orders
						const purchaseOrdersRaw = localStorage.getItem('purchaseOrders');
						const purchaseOrders = purchaseOrdersRaw ? JSON.parse(purchaseOrdersRaw) : [];
						
						// Check PSIR data
						const psirDataRaw = localStorage.getItem('psirData');
						const psirData = psirDataRaw ? JSON.parse(psirDataRaw) : [];

						// Check VSIR data
						const vsirRaw = localStorage.getItem('vsri-records');
						const vsirData = vsirRaw ? JSON.parse(vsirRaw) : [];
						
						// Find matching records
						let matchingPO = null;
						let matchingPSIR = null;
						let matchingVSIR = null;
						if (poNo) {
							matchingPO = purchaseOrders.find((p: any) => p.poNo === poNo);
							matchingPSIR = psirData.find((p: any) => p.poNo === poNo);
							matchingVSIR = vsirData.find((v: any) => v.poNo === poNo);
						}
						
						const report = [
							{ label: 'Selected PO No', value: poNo || 'None' },
							{ label: 'PurchaseOrders Count', value: purchaseOrders.length },
							{ label: 'PSIR Records Count', value: psirData.length },
							{ label: 'VSIR Records Count', value: vsirData.length },
							{ label: 'Matching PO Found', value: matchingPO ? '✓ YES' : '✗ NO' },
							{ label: 'Matching PO OA NO', value: matchingPO?.oaNo || 'empty' },
							{ label: 'Matching PSIR Found', value: matchingPSIR ? '✓ YES' : '✗ NO' },
							{ label: 'Matching PSIR OA NO', value: matchingPSIR?.oaNo || 'empty' },
							{ label: 'Matching PSIR Batch No', value: matchingPSIR?.batchNo || 'empty' },
							{ label: 'Matching VSIR Found', value: matchingVSIR ? '✓ YES' : '✗ NO' },
							{ label: 'Matching VSIR Vendor Batch No', value: matchingVSIR?.vendorBatchNo || 'empty' },
							{ label: 'Current Form OA NO', value: newOrder.oaNo || 'empty' },
							{ label: 'Current Form Batch No', value: newOrder.batchNo || 'empty' },
						];
						
						console.log('=== VENDOR DEPT DEBUG ===');
						console.log('Purchase Orders:', purchaseOrders);
						console.log('PSIR Data:', psirData);
						console.log('VSIR Data:', vsirData);
						console.log('Matching PO:', matchingPO);
						console.log('Matching PSIR:', matchingPSIR);
						console.log('Matching VSIR:', matchingVSIR);
						console.log('Current newOrder:', newOrder);
						
						setDebugReport(report);
						setDebugOpen(!debugOpen);
					}} style={{ padding: '8px 12px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
						🔍 Debug {debugOpen ? '▼' : '▶'}
					</button>
					<button onClick={() => regenerateVendorBatchNos()} style={{ padding: '8px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
						🔄 Regenerate Vendor Batch Nos
					</button>
					<button onClick={() => syncBatchNoFromPSIR()} style={{ padding: '8px 12px', background: '#2196f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
						📥 Sync Batch No from PSIR
					</button>
				</div>
				
				{debugOpen && (
					<div style={{ marginBottom: 16, background: '#f0f0f0', padding: 12, borderRadius: 4, border: '1px solid #ccc' }}>
						<h4>Debug Report</h4>
						<table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
							<tbody>
								{debugReport.map((row, idx) => (
									<tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
										<td style={{ padding: 6, fontWeight: 'bold', width: '50%' }}>{row.label}:</td>
										<td style={{ padding: 6, background: row.value === 'empty' || row.value === '✗ NO' || row.value === '0' ? '#ffcccc' : '#ccffcc' }}>
											{String(row.value)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
				
				<div style={{ marginBottom: 16, display: 'none', gap: 8, alignItems: 'center' }}>
					<label>Material Purchase PO No:</label>
					<select
						value={newOrder.materialPurchasePoNo}
						onChange={e => setNewOrder({ ...newOrder, materialPurchasePoNo: e.target.value })}
						style={{ padding: '6px', border: '1px solid #ccc', borderRadius: 4 }}
					>
						<option value="">Select PO No</option>
						{purchasePOs.map(po => <option key={po} value={po}>{po}</option>)}
					</select>
				</div>
				<div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
					<label>Order Place Date (from PSIR):</label>
					<input type="text" value={newOrder.orderPlaceDate} readOnly style={{ padding: '6px', border: '1px solid #ccc', borderRadius: 4, background: '#f0f0f0' }} />
					<label>OA NO:</label>
					<input type="text" value={newOrder.oaNo} readOnly style={{ padding: '6px', border: '1px solid #ccc', borderRadius: 4, background: '#f0f0f0' }} />
					<label>Batch No:</label>
					<input type="text" value={newOrder.batchNo} readOnly style={{ padding: '6px', border: '1px solid #ccc', borderRadius: 4, background: '#f0f0f0' }} />
					<label>Vendor Batch No:</label>
					<input
						type="text"
						placeholder="Enter or auto-filled from VSIR"
						value={newOrder.vendorBatchNo}
						onChange={(e) => setNewOrder({ ...newOrder, vendorBatchNo: e.target.value })}
						style={{ padding: '6px', border: '1px solid #ccc', borderRadius: 4 }}
					/>
					<label>Vendor Name (Enter manually):</label>
					<input
						type="text"
						placeholder="Enter Vendor Name"
						value={newOrder.vendorName}
						onChange={e => setNewOrder({ ...newOrder, vendorName: e.target.value })}
						style={{ fontWeight: 'bold', background: '#fff', width: 200, border: '2px solid #1976d2', color: '#1976d2', padding: '6px' }}
					/>
				</div>
				<div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
					<label>DC No (Enter manually):</label>
					<input
						type="text"
						placeholder="Enter DC No manually"
						value={newOrder.dcNo}
						onChange={e => setNewOrder({ ...newOrder, dcNo: e.target.value })}
						style={{ fontWeight: 'bold', background: '#fff', width: 160, border: '2px solid #1976d2', color: '#1976d2' }}
					/>
				</div>

				<div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
					<label>Item Name:</label>
					{itemNames.length > 0 ? (
						<select
							name="itemName"
							value={itemInput.itemName}
							onChange={e => {
								const value = e.target.value;
								const found = itemMaster.find(item => item.itemName === value);
								const foundCode = found ? found.itemCode : '';
								const inferredQty = getPurchaseQty(newOrder.materialPurchasePoNo, foundCode) || itemInput.qty;
								setItemInput({ ...itemInput, itemName: value, itemCode: foundCode, qty: inferredQty, closingStock: getClosingStock(foundCode, value) });
							}}
						>
							<option value="">Select Item Name</option>
							{itemNames.map(name => (
								<option key={name} value={name}>{name}</option>
							))}
						</select>
					) : (
						<input
							type="text"
							name="itemName"
							value={itemInput.itemName}
							onChange={e => setItemInput({ ...itemInput, itemName: e.target.value })}
						/>
					)}
					<input placeholder="Item Code" value={itemInput.itemCode} onChange={e => setItemInput({ ...itemInput, itemCode: e.target.value })} readOnly={itemNames.length > 0} />
					<input placeholder="Material Issue No" value={itemInput.materialIssueNo} onChange={e => setItemInput({ ...itemInput, materialIssueNo: e.target.value })} />
					<input type="number" placeholder="Qty" min="0" value={itemInput.qty || ''} onChange={e => setItemInput({ ...itemInput, qty: Math.max(0, Number(e.target.value)) })} />
					<select value={itemInput.indentStatus} onChange={e => setItemInput({ ...itemInput, indentStatus: e.target.value })} >
						<option value="">Indent Status</option>
						{indentStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
					</select>
					<input type="number" placeholder="Received Qty" min="0" value={itemInput.receivedQty || ''} onChange={e => setItemInput({ ...itemInput, receivedQty: Math.max(0, Number(e.target.value)) })} />
					<input type="number" placeholder="OK Qty" min="0" value={itemInput.okQty || ''} onChange={e => setItemInput({ ...itemInput, okQty: Math.max(0, Number(e.target.value)) })} />
					<input type="number" placeholder="Rework Qty" min="0" value={itemInput.reworkQty || ''} onChange={e => setItemInput({ ...itemInput, reworkQty: Math.max(0, Number(e.target.value)) })} />
					<input type="number" placeholder="Rejected Qty" min="0" value={itemInput.rejectedQty || ''} onChange={e => setItemInput({ ...itemInput, rejectedQty: Math.max(0, Number(e.target.value)) })} />
					<input placeholder="GRN No" value={itemInput.grnNo} onChange={e => setItemInput({ ...itemInput, grnNo: e.target.value })} />
					<input placeholder="Debit Note or Qty Returned" value={itemInput.debitNoteOrQtyReturned} onChange={e => setItemInput({ ...itemInput, debitNoteOrQtyReturned: e.target.value })} />
					<input placeholder="Remarks" value={itemInput.remarks} onChange={e => setItemInput({ ...itemInput, remarks: e.target.value })} />
					<button onClick={handleSaveItem}>
						{editIdx ? 'Update Item' : 'Add Item'}
					</button>
				</div>

				{editOrderIdx !== null && newOrder.items && newOrder.items.length > 0 && (
					<div style={{ marginBottom: 16, border: '1px solid #2196f3', borderRadius: 4, padding: 8, background: '#e3f2fd' }}>
						<h4 style={{ margin: '0 0 12px 0', color: '#1976d2' }}>Items in Current Order</h4>
						<table border={1} cellPadding={6} style={{ width: '100%', fontSize: 12 }}>
							<thead>
								<tr style={{ background: '#1976d2', color: '#fff' }}>
									<th>Item Name</th>
									<th>Item Code</th>
									<th>Material Issue No</th>
									<th>Qty</th>
																	<th>Planned Qty</th>
									<th>Indent Status</th>
									<th>Received Qty</th>
									<th>OK Qty</th>
									<th>Rework Qty</th>
									<th>Rejected Qty</th>
									<th>GRN No</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{newOrder.items.map((item, itemIdx) => (
									<tr key={itemIdx}>
										<td>{item.itemName || '—'}</td>
										<td>{item.itemCode || '—'}</td>
										<td>{item.materialIssueNo || '—'}</td>
										<td>{item.qty || '—'}</td>
																		<td>{item.plannedQty || '—'}</td>
										<td>{item.indentStatus || '—'}</td>
										<td>{item.receivedQty || '—'}</td>
										<td>{typeof item.okQty === 'number' ? item.okQty : 0}</td>
										<td>{item.reworkQty || '—'}</td>
										<td>{item.rejectedQty || '—'}</td>
										<td>{item.grnNo || '—'}</td>
										<td style={{ display: 'flex', gap: 4 }}>
											<button
												onClick={() => {
													setItemInput(item);
													setEditIdx({ orderIdx: 0, itemIdx });
												}}
												style={{ background: '#ff9800', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
											>
												Edit
											</button>
											<button
												onClick={() => {
													setNewOrder(prev => ({
														...prev,
														items: prev.items.filter((_, idx) => idx !== itemIdx)
													}));
												}}
												style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
											>
												Delete
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				<button onClick={editOrderIdx !== null ? handleUpdateOrder : handleAddOrder}>
					{editOrderIdx !== null ? 'Update Vendor Dept Order' : 'Add Vendor Dept Order'}
				</button>
				{editOrderIdx !== null && (
					<button onClick={() => {
						clearNewOrder();
						setEditOrderIdx(null);
					}} style={{ background: '#757575', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer', marginLeft: 8 }}>
						Cancel
					</button>
				)}
				<h3>Vendor Dept Orders</h3>
				<div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
					<button onClick={() => { syncEmptyVendorDeptQty(); alert('Sync Empty Qty completed'); }} style={{ padding: '6px 10px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Sync Empty Qty</button>
					<button onClick={() => { if (confirm('Force sync will overwrite qty values where purchase data exists. Continue?')) { forceVendorDeptSync(); alert('Force Sync completed'); } }} style={{ padding: '6px 10px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Force Sync</button>
					<button onClick={() => { setDebugOpen(prev => !prev); if (!debugOpen) buildDebugReport(); }} style={{ padding: '6px 10px', background: '#9c27b0', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>{debugOpen ? 'Hide Debug' : 'Show Debug'}</button>
					<button onClick={() => { setStockDebugOpen(prev => !prev); if (!stockDebugOpen) buildStockDebugReport(); }} style={{ padding: '6px 10px', background: '#673ab7', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>{stockDebugOpen ? 'Hide Stock Debug' : 'Show Stock Debug'}</button>
				</div>
				{stockDebugOpen && (
					<div style={{ marginBottom: 12, border: '1px solid #ccc', padding: 8, background: '#fffef0', borderRadius: 4 }}>
						<h4 style={{ margin: '0 0 12px 0' }}>Debug: Stock Matching</h4>
						<table border={1} cellPadding={6} style={{ width: '100%', marginBottom: 8, fontSize: 12 }}>
							<thead>
								<tr style={{ background: '#f5f5f5' }}>
									<th>PO</th>
									<th>Item Code</th>
									<th>Item Name</th>
									<th>Matched</th>
									<th>Matched By</th>
									<th>Closing Stock</th>
									<th>Computed Stock</th>
							<th>Closing Key</th>
							<th>Closing Raw</th>
							<th>Matched Record (JSON)</th>
								</tr>
							</thead>
							<tbody>
								{stockDebugReport.map((r, i) => (
									<tr key={i} style={{ borderBottom: '1px solid #eee' }}>
										<td>{r.po}</td>
										<td>{r.itemCode}</td>
										<td>{r.itemName}</td>
										<td>{r.matched ? '✓' : '✗'}</td>
										<td>{r.matchedBy}</td>
										<td>{r.closingStock ?? '—'}</td>
										<td>{r.computed}</td>
							<td>{r.closingKey ?? '—'}</td>
							<td>{r.closingRaw ?? '—'}</td>
										<td style={{ maxWidth: 300 }}><pre style={{ whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto', fontSize: 11 }}>{JSON.stringify(r.matchedRecord || {}, null, 2)}</pre></td>
									</tr>
								))}
							</tbody>
						</table>
						<button onClick={() => { const r = buildStockDebugReport(); alert(`Refreshed: ${r.length} entries`); }} style={{ padding: '6px 10px', marginRight: 8 }}>Refresh</button>
						<button onClick={() => { setStockDebugReport([]); setStockDebugOpen(false); }} style={{ padding: '6px 10px' }}>Close</button>
					</div>
				)}
				{debugOpen && (
					<div style={{ marginBottom: 12, border: '1px solid #ccc', padding: 8, background: '#f9f9f9', borderRadius: 4 }}>
						<h4 style={{ margin: '0 0 12px 0' }}>Debug: Data Sources</h4>
						<table border={1} cellPadding={6} style={{ width: '100%', marginBottom: 8, fontSize: 12 }}>
							<thead>
								<tr style={{ background: '#f5f5f5' }}>
									<th>PO No</th>
									<th>Item Code</th>
									<th>Current Qty</th>
									<th>Purchase Qty</th>
									<th>PSIR Received</th>
									<th>purchaseData Match</th>
									<th>Source</th>
								</tr>
							</thead>
							<tbody>
								{debugReport.map((r, i) => (
									<tr key={i} style={{ borderBottom: '1px solid #eee' }}>
										<td>{r.po}</td>
										<td>{r.itemCode}</td>
										<td>{r.currentQty}</td>
										<td>{r.purchaseQty}</td>
										<td>{r.psirQty}</td>
										<td>{r.pdMatch ? '✓' : '✗'}</td>
										<td>{r.inferredSource}</td>
									</tr>
								))}
							</tbody>
						</table>
						<button onClick={() => { const r = buildDebugReport(); alert(`Refreshed: ${r.length} entries`); }} style={{ padding: '6px 10px', marginRight: 8 }}>Refresh</button>
						<button onClick={() => { setDebugReport([]); setDebugOpen(false); }} style={{ padding: '6px 10px' }}>Close</button>
					</div>
				)}
				<div style={{ overflowX: 'auto', marginBottom: 16 }}>
					<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, background: '#fff', border: '1px solid #ccc' }}>
						<thead>
							<tr style={{ background: '#fff', borderBottom: '2px solid #333', fontWeight: 'bold' }}>
								<th style={{ padding: '10px 8px', textAlign: 'center', width: '40px', borderRight: '1px solid #ccc' }}>#</th>
								<th style={{ padding: '10px 8px', textAlign: 'left', minWidth: '100px', borderRight: '1px solid #ccc' }}>Item</th>
								<th style={{ padding: '10px 8px', textAlign: 'left', minWidth: '70px', borderRight: '1px solid #ccc' }}>Code</th>
								<th style={{ padding: '10px 8px', textAlign: 'left', minWidth: '80px', borderRight: '1px solid #ccc' }}>PO No</th>
								<th style={{ padding: '10px 8px', textAlign: 'left', minWidth: '80px', borderRight: '1px solid #ccc' }}>OA NO</th>
								<th style={{ padding: '10px 8px', textAlign: 'left', minWidth: '100px', borderRight: '1px solid #ccc' }}>Vendor</th>
								<th style={{ padding: '10px 8px', textAlign: 'center', minWidth: '60px', borderRight: '1px solid #ccc' }}>PO Qty</th>
								<th style={{ padding: '10px 8px', textAlign: 'center', minWidth: '60px', borderRight: '1px solid #ccc' }}>Planned Qty</th>
								<th style={{ padding: '10px 8px', textAlign: 'center', minWidth: '60px', borderRight: '1px solid #ccc' }}>Rcvd Qty</th>
								<th style={{ padding: '10px 8px', textAlign: 'center', minWidth: '50px', borderRight: '1px solid #ccc' }}>OK Qty</th>
								<th style={{ padding: '10px 8px', textAlign: 'center', minWidth: '60px', borderRight: '1px solid #ccc' }}>Rework Qty</th>
								<th style={{ padding: '10px 8px', textAlign: 'center', minWidth: '70px', borderRight: '1px solid #ccc' }}>Rejected Qty</th>
								<th style={{ padding: '10px 8px', textAlign: 'left', minWidth: '80px', borderRight: '1px solid #ccc' }}>GRN No</th>
								<th style={{ padding: '10px 8px', textAlign: 'center', minWidth: '80px', borderRight: '1px solid #ccc' }}>Stock</th>
								<th style={{ padding: '10px 8px', textAlign: 'left', minWidth: '80px', borderRight: '1px solid #ccc' }}>Status</th>
								<th style={{ padding: '10px 8px', textAlign: 'center', minWidth: '70px' }}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{orders.map((order, idx) => {
								if (order.items.length === 0) {
									return (
										<tr key={idx} style={{ background: '#fff', borderBottom: '1px solid #ccc' }}>
											<td style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #ccc' }}>—</td>
											<td style={{ padding: '10px 8px', borderRight: '1px solid #ccc' }}>—</td>
											<td style={{ padding: '10px 8px', borderRight: '1px solid #ccc' }}>—</td>
											<td style={{ padding: '10px 8px', borderRight: '1px solid #ccc' }}>{order.materialPurchasePoNo}</td>
											<td style={{ padding: '10px 8px', borderRight: '1px solid #ccc' }}>{order.oaNo}</td>
											<td style={{ padding: '10px 8px', borderRight: '1px solid #ccc' }}>{order.vendorName}</td>
											<td colSpan={7} style={{ padding: '10px 8px', textAlign: 'center', color: '#888', borderRight: '1px solid #ccc' }}>(No items)</td>
											<td style={{ padding: '10px 8px', textAlign: 'center', display: 'flex', gap: 4, justifyContent: 'center' }}>
												<button onClick={() => handleEditOrder(idx)} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 2, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>Edit</button>
												<button onClick={() => handleDeleteOrder(idx)} style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 2, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>Del</button>
											</td>
										</tr>
									);
								}
								return order.items.map((item, itemIdx) => {
									const stockVal = getClosingStock(item.itemCode, item.itemName);
									const stockNum = Number(stockVal);
									const stockDisplay = stockNum < 0 ? stockNum : (stockNum > 0 ? `+${stockNum}` : '0');
									const indentStatus = (() => {
										try {
											const purchaseStatus = getIndentStatusFromPurchase(order.materialPurchasePoNo, item.itemCode, item.materialIssueNo || '');
											return (purchaseStatus || (item.indentStatus || '')).toString().toUpperCase();
										} catch {
											return 'UNKNOWN';
										}
									})();
									
									return (
										<tr key={`${idx}-${itemIdx}`} style={{ borderBottom: '1px solid #ccc', background: '#fff' }}>
											<td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', color: '#555', borderRight: '1px solid #ccc' }}>{idx + 1}</td>
											<td style={{ padding: '10px 8px', borderRight: '1px solid #ccc' }}>{item.itemName || '—'}</td>
											<td style={{ padding: '10px 8px', borderRight: '1px solid #ccc' }}>{item.itemCode || '—'}</td>
											<td style={{ padding: '10px 8px', borderRight: '1px solid #ccc' }}>{order.materialPurchasePoNo}</td>
											<td style={{ padding: '10px 8px', borderRight: '1px solid #ccc' }}>{order.oaNo}</td>
											<td style={{ padding: '10px 8px', borderRight: '1px solid #ccc' }}>{order.vendorName}</td>
											<td style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #ccc' }}>{Math.abs(getPurchaseQty(order.materialPurchasePoNo, item.itemCode, purchaseOrders, purchaseData)) || 0}</td>
											<td style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #ccc' }}>{item.plannedQty ?? '—'}</td>
											<td style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #ccc' }}>{item.receivedQty || '—'}</td>
											<td style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #ccc' }}>{item.okQty || '—'}</td>
											<td style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #ccc' }}>{item.reworkQty || '—'}</td>
											<td style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #ccc' }}>{item.rejectedQty || '—'}</td>
											<td style={{ padding: '10px 8px', borderRight: '1px solid #ccc' }}>{item.grnNo || '—'}</td>
											<td style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #ccc' }}>
												<span style={{ 
													background: stockNum < 0 ? '#e53935' : '#c8e6c9', 
													color: stockNum < 0 ? '#fff' : '#333',
													padding: '4px 8px', 
													borderRadius: '2px', 
													fontSize: '11px',
													fontWeight: 'bold',
													display: 'inline-block'
												}}>
													{stockDisplay}
												</span>
											</td>
											<td style={{ padding: '10px 8px', borderRight: '1px solid #ccc', background: '#fffacd' }}>
												{indentStatus}
											</td>
											<td style={{ padding: '10px 8px', textAlign: 'center', display: 'flex', gap: 4, justifyContent: 'center' }}>
												<button onClick={() => handleEditOrder(idx)} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 2, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>Edit</button>
												<button onClick={() => handleDeleteItem(idx, itemIdx)} style={{ background: '#e53935', color: '#fff', border: 'none', borderRadius: 2, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>Del</button>
											</td>
										</tr>
									);
								});
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
export default VendorDeptModule; 
=======
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import bus from '../utils/eventBus';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import {
  getPurchaseOrders, getPurchaseData, subscribeVendorDepts,
  addVendorDept, updateVendorDept, deleteVendorDept,
} from '../utils/firestoreServices';
import { subscribeVSIRRecords } from '../utils/firestoreServices';
import { subscribePsirs } from '../utils/psirService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VendorDeptItem {
  itemName: string; itemCode: string; materialIssueNo: string; qty: number;
  plannedQty?: number; closingStock?: number | string; indentStatus: string;
  receivedQty: number; okQty: number; reworkQty: number; rejectedQty: number;
  grnNo: string; debitNoteOrQtyReturned: string; remarks: string;
}

interface VendorDeptOrder {
  id?: string; orderPlaceDate: string; materialPurchasePoNo: string;
  oaNo: string; batchNo: string; vendorBatchNo: string; dcNo: string;
  vendorName: string; items: VendorDeptItem[];
}

// ─── Blank templates ──────────────────────────────────────────────────────────

const BLANK_ITEM: VendorDeptItem = {
  itemName: '', itemCode: '', materialIssueNo: '', qty: 0, plannedQty: 0,
  closingStock: '', indentStatus: '', receivedQty: 0, okQty: 0,
  reworkQty: 0, rejectedQty: 0, grnNo: '', debitNoteOrQtyReturned: '', remarks: '',
};

const BLANK_ORDER: VendorDeptOrder = {
  orderPlaceDate: '', materialPurchasePoNo: '', oaNo: '', batchNo: '',
  vendorBatchNo: '', dcNo: '', vendorName: '', items: [],
};

const INDENT_STATUS_OPTIONS = ['Open', 'Closed', 'Partial'];

// ─── Global CSS ───────────────────────────────────────────────────────────────

const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');

.vdm { font-family:'DM Sans',system-ui,sans-serif; color:#111827; background:#f4f5f9; }
.vdm * { box-sizing:border-box; font-family:inherit; }
.vdm-inner { max-width:1480px; margin:0 auto; padding:24px 28px; }

/* ── Inputs ── */
.vdm-input {
  padding:8px 12px; border-radius:8px; border:1.5px solid #e2e4ea;
  font-size:13.5px; width:100%; transition:border-color 0.15s,box-shadow 0.15s;
  background:#fff; color:#111; line-height:1.5; font-weight:400;
}
.vdm-input:focus { outline:none; border-color:#1a237e; box-shadow:0 0 0 3px rgba(26,35,126,0.1); }
.vdm-input-ro { background:#f7f8fb !important; color:#8b95a1 !important; cursor:default; }
.vdm-input-accent { border-color:#1a237e !important; font-weight:500; }
.vdm-select {
  -webkit-appearance:none; appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238b95a1' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 10px center; padding-right:34px;
}

/* ── Buttons ── */
.vdm-btn {
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  padding:9px 18px; border-radius:8px; border:none; cursor:pointer;
  font-size:13px; font-weight:600; transition:all 0.15s; white-space:nowrap; letter-spacing:0.01em;
  line-height:1;
}
.vdm-btn:active { transform:scale(0.97); }
.vdm-btn-sm  { padding:7px 14px; font-size:12.5px; border-radius:7px; }
.vdm-btn-xs  { padding:4px 9px;  font-size:11.5px; border-radius:6px; }
.vdm-btn-primary { background:#1a237e; color:#fff; }
.vdm-btn-primary:hover { background:#283593; }
.vdm-btn-success { background:#16a34a; color:#fff; }
.vdm-btn-success:hover { background:#15803d; }
.vdm-btn-danger  { background:#ef4444; color:#fff; }
.vdm-btn-danger:hover  { background:#dc2626; }
.vdm-btn-warning { background:#d97706; color:#fff; }
.vdm-btn-warning:hover { background:#b45309; }
.vdm-btn-ghost { background:#fff; color:#374151; border:1.5px solid #e2e4ea; }
.vdm-btn-ghost:hover { background:#f7f8fb; border-color:#c9cdd8; }
.vdm-btn-indigo { background:#4f46e5; color:#fff; }
.vdm-btn-indigo:hover { background:#4338ca; }

/* ── Cards ── */
.vdm-card { background:#fff; border-radius:12px; border:1px solid #e2e4ea; box-shadow:0 1px 4px rgba(0,0,0,0.05); overflow:hidden; }
.vdm-card-edit { border:2px solid #1a237e !important; box-shadow:0 0 0 4px rgba(26,35,126,0.07),0 4px 20px rgba(0,0,0,0.08) !important; }

/* ── Labels ── */
.vdm-lbl { font-size:11px; font-weight:700; color:#8b95a1; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:5px; display:block; }

/* ── Section label ── */
.vdm-sec {
  font-size:10.5px; font-weight:800; color:#a5b0be; text-transform:uppercase; letter-spacing:0.1em;
  display:flex; align-items:center; gap:10px; padding:4px 0 12px;
}
.vdm-sec::after { content:''; flex:1; height:1px; background:#edf0f5; }

/* ── Stats ── */
.vdm-stats { display:flex; align-items:center; }
.vdm-stat { text-align:center; padding:4px 28px; }
.vdm-stat:first-child { padding-left:6px; }
.vdm-stat-val { font-size:30px; font-weight:700; line-height:1; letter-spacing:-0.02em; }
.vdm-stat-lbl { font-size:10.5px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.07em; margin-top:5px; }
.vdm-divider-v { width:1px; background:#e2e4ea; height:46px; flex-shrink:0; }

/* ── Toolbar ── */
.vdm-toolbar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.vdm-divider-sm { width:1px; height:26px; background:#e2e4ea; }

/* ── Filter panel ── */
.vdm-fpanel {
  background:#eef2ff; border:1px solid #c7d2fe; border-radius:10px;
  padding:16px 20px; display:flex; align-items:flex-end; gap:14px; flex-wrap:wrap;
  animation:vdmFadeDown 0.18s cubic-bezier(.34,1.56,.64,1);
}
@keyframes vdmFadeDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

/* ── Active filter chips ── */
.vdm-chip {
  display:inline-flex; align-items:center; gap:4px; background:#e0e7ff; color:#3730a3;
  border-radius:20px; padding:4px 11px; font-size:11.5px; font-weight:600;
}
.vdm-chip-x { cursor:pointer; opacity:0.5; font-size:14px; line-height:1; margin-left:1px; }
.vdm-chip-x:hover { opacity:1; }
.vdm-rowcount { background:#eef2ff; color:#3730a3; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; }

/* ── PO bar ── */
.vdm-pobar {
  display:flex; align-items:center; gap:12px; flex-wrap:wrap;
  background:#eef2ff; border:1px solid #c7d2fe; border-radius:10px; padding:14px 18px; margin-bottom:18px;
}
.vdm-pobar-meta { font-size:12px; color:#6b7280; display:flex; align-items:center; gap:4px; }
.vdm-pobar-meta strong { color:#111; font-weight:600; }

/* ── Items mini table ── */
.vdm-itable { width:100%; border-collapse:collapse; font-size:12.5px; }
.vdm-itable th { padding:8px 10px; background:#f4f5f9; color:#5b6474; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #e2e4ea; text-align:left; }
.vdm-itable th.r { text-align:right; }
.vdm-itable td { padding:9px 10px; border-bottom:1px solid #f0f1f5; vertical-align:middle; }
.vdm-itable td.r { text-align:right; font-variant-numeric:tabular-nums; }
.vdm-itable tr:last-child td { border-bottom:none; }
.vdm-itable tr:hover td { background:#f9faff; }

/* ── Main table ── */
.vdm-table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:12.5px; }
.vdm-table th {
  padding:11px 10px; font-size:10.5px; font-weight:700; color:#1a237e;
  text-transform:uppercase; letter-spacing:0.05em;
  background:#eef2ff; border-bottom:2px solid #c7d2fe; text-align:left; white-space:nowrap;
}
.vdm-table th.r { text-align:right; }
.vdm-table th.div-l { border-left:2px solid #c7d2fe; }
.vdm-table td { padding:10px 10px; border-bottom:1px solid #f0f1f5; vertical-align:middle; }
.vdm-table td.r { text-align:right; font-variant-numeric:tabular-nums; }
.vdm-table td.div-l { border-left:2px solid #eef2ff; }
.vdm-table tr:nth-child(even) td { background:#fafbff; }
.vdm-table tr:hover td { background:#f5f7ff !important; transition:background 0.1s; }

/* ── Utility ── */
.ellipsis { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block; }
.mono { font-family:'JetBrains Mono',monospace; font-size:11.5px; }
.badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
.badge-open    { background:#e0e7ff; color:#3730a3; }
.badge-closed  { background:#dcfce7; color:#16a34a; }
.badge-partial { background:#fef3c7; color:#b45309; }
.badge-none    { background:#f3f4f6; color:#9ca3af; }
.stk { display:inline-block; padding:3px 9px; border-radius:6px; font-size:11.5px; font-weight:700; }
.stk-pos  { background:#dcfce7; color:#16a34a; }
.stk-neg  { background:#fee2e2; color:#ef4444; }
.stk-zero { background:#f3f4f6; color:#9ca3af; }
.vdm-empty { padding:52px; text-align:center; color:#9ca3af; }
.vdm-empty-icon { font-size:36px; margin-bottom:12px; opacity:0.45; }

/* ── Toasts ── */
.vdm-toasts { position:fixed; top:22px; right:22px; z-index:9999; display:flex; flex-direction:column; gap:8px; pointer-events:none; }
.vdm-toast {
  padding:12px 18px; border-radius:10px; font-size:13px; font-weight:500; max-width:360px;
  box-shadow:0 4px 20px rgba(0,0,0,0.12); pointer-events:all;
  animation:toastPop 0.24s cubic-bezier(0.34,1.56,0.64,1) both;
}
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

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const norm = (v: any) => (v == null ? '' : String(v).trim().toUpperCase());
const alpha = (v: any) => norm(v).replace(/[^A-Z0-9]/g, '');

const getNumericField = (obj: any, keys: string[]): number | null => {
  for (const k of keys) { if (obj?.[k] != null) { const n = Number(String(obj[k]).trim()); if (!isNaN(n)) return n; } }
  return null;
};

const findNumericField = (obj: any, keys: string[]): { key: string; value: number } | null => {
  for (const k of keys) { if (obj?.[k] != null) { const n = Number(String(obj[k]).trim()); if (!isNaN(n)) return { key: k, value: n }; } }
  return null;
};

const CLOSING_KEYS = ['closingStock','closing_stock','ClosingStock','closing','closingQty',
  'closing_qty','Closing','closing stock','Closing Stock','closingstock','closingStockQty'];
const STOCK_QTY_KEYS = ['stockQty','stock_qty','stock','StockQty','currentStock'];
const PURCHASE_STORE_KEYS = ['purchaseActualQtyInStore','purchase_actual_qty_in_store','purchaseActualQty','purchase_actual_qty'];

const chooseBestStock = (cands: any[]): any | null => {
  if (!cands?.length) return null;
  let best: any = null, bv = Number.NEGATIVE_INFINITY;
  for (const s of cands) {
    const c = findNumericField(s, CLOSING_KEYS);
    const cv = c ? c.value : (getNumericField(s, STOCK_QTY_KEYS) || 0) + (getNumericField(s, PURCHASE_STORE_KEYS) || 0);
    if (best === null || cv > bv || (cv === bv && (s.id || 0) > (best.id || 0))) { best = s; bv = cv; }
  }
  return best;
};

const matchStock = (stocks: any[], itemCode?: string, itemName?: string): any | null => {
  if (!stocks?.length || (!itemCode && !itemName)) return null;
  const lu = [itemCode, itemName].filter(Boolean).join(' ');
  const t = norm(lu), ta = alpha(lu);
  const cn = norm(itemCode || ''), nn = norm(itemName || '');
  const try2 = (fn: (s: any) => boolean) => { const m = stocks.filter(fn); return m.length ? chooseBestStock(m) : null; };
  return (
    (cn && try2(s => norm(s.itemCode || s.ItemCode || s.code || s.Code || s.item_code) === cn)) ||
    (nn && try2(s => norm(s.itemName || s.ItemName || s.name || s.Name) === nn)) ||
    try2(s => [s.itemCode, s.ItemCode, s.code, s.Code, s.itemName, s.ItemName, s.name, s.Name, s.sku].some(c => alpha(c) === ta || norm(c) === t)) ||
    try2(s => Object.values(s).some((v: any) => { try { const a = alpha(v), n = norm(v); return a.includes(ta) || ta.includes(a) || n.includes(t) || t.includes(n); } catch { return false; } })) ||
    null
  );
};

const computeStock = (rec: any): number | string => {
  if (!rec) return '';
  const c = findNumericField(rec, CLOSING_KEYS);
  if (c) return c.value;
  return (getNumericField(rec, STOCK_QTY_KEYS) || 0) + (getNumericField(rec, PURCHASE_STORE_KEYS) || 0);
};

const getPurchaseQty = (poNo: any, itemCode: any, pos: any[], pd: any[]): number => {
  try {
    if (!poNo || !itemCode) return 0;
    const tp = norm(poNo), tc = norm(itemCode);
    const po = pos?.find((p: any) => norm(p.poNo) === tp);
    if (po) {
      if (Array.isArray(po.items)) { const m = po.items.find((it: any) => norm(it.itemCode || it.Code) === tc); if (m) return Number(m.poQty ?? m.originalIndentQty ?? m.qty ?? m.purchaseQty ?? 0); }
      else if (norm(po.itemCode || po.Code) === tc) return Number(po.purchaseQty ?? po.qty ?? 0);
    }
    const pm = pd?.find((it: any) => (norm(it.poNo) === tp || norm(it.indentNo) === tp) && norm(it.itemCode || it.Code) === tc);
    return pm ? Number(pm.poQty ?? pm.originalIndentQty ?? pm.qty ?? pm.purchaseQty ?? 0) : 0;
  } catch { return 0; }
};

const getIndentStatus = (poNo: any, itemCode: any, indentNo: any, pd: any[], pos: any[]): string => {
  try {
    const tp = norm(poNo), tc = norm(itemCode), ti = norm(indentNo);
    const pf = pd?.find((it: any) => (norm(it.poNo) === tp || norm(it.indentNo) === ti) && norm(it.itemCode || it.Code) === tc);
    if (pf?.indentStatus) return String(pf.indentStatus);
    const po = pos?.find((p: any) => norm(p.poNo) === tp || norm(p.poNo || p.indentNo) === tp);
    if (po) {
      if (Array.isArray(po.items)) { const m = po.items.find((it: any) => norm(it.itemCode || it.Code) === tc); if (m?.indentStatus) return String(m.indentStatus); }
      else if (po.itemCode && norm(po.itemCode) === tc && po.indentStatus) return String(po.indentStatus);
    }
  } catch {}
  return '';
};

const getSupplierFromPO = (poNo: any, pos: any[], pd: any[]): string =>
  String(pos?.find((p: any) => norm(p.poNo) === norm(poNo))?.supplierName || pd?.find((p: any) => norm(p.poNo) === norm(poNo))?.supplierName || '').trim();

const getVendorBatchFromVSIR = (poNo: any, vsir: any[]): string => {
  if (!poNo || !vsir?.length) return '';
  return vsir.find((r: any) => String(r.poNo || '').trim() === String(poNo).trim() && r.vendorBatchNo?.trim())?.vendorBatchNo || '';
};

const getPSIRByPO = (poNo: any, psir: any[]): any =>
  psir?.find((r: any) => String(r.poNo || '').trim() === String(poNo || '').trim()) || null;

// ─── CSV export ───────────────────────────────────────────────────────────────

const exportCSV = (rows: any[]) => {
  const H = ['#','PO No','OA No','Vendor','Date','Batch No','Vendor Batch','DC No',
    'Item Name','Item Code','Issue No','PO Qty','Planned Qty','Rcvd','OK','Rework','Rejected','GRN No','Stock','Status','Remarks'];
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [H.map(esc).join(',')];
  rows.forEach((r, i) => lines.push([
    i + 1, r.materialPurchasePoNo, r.oaNo, r.vendorName, r.orderPlaceDate,
    r.batchNo, r.vendorBatchNo, r.dcNo,
    r._item.itemName, r._item.itemCode, r._item.materialIssueNo,
    r._poQty, r._item.plannedQty ?? '', r._item.receivedQty,
    r._item.okQty, r._item.reworkQty, r._item.rejectedQty,
    r._item.grnNo, r._stock, r._status, r._item.remarks,
  ].map(esc).join(',')));
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `vendor-dept-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
};

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

// ─── Sub-components ───────────────────────────────────────────────────────────

const Field: React.FC<{ label: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ label, children, style }) => (
  <div style={style}>
    <span className="vdm-lbl">{label}</span>
    {children}
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = (status || '').toUpperCase();
  const cls = s === 'CLOSED' ? 'badge-closed' : s === 'PARTIAL' ? 'badge-partial' : s === 'OPEN' ? 'badge-open' : 'badge-none';
  return <span className={`badge ${cls}`}>{s || '—'}</span>;
};

const StockBadge: React.FC<{ val: number | string }> = ({ val }) => {
  if (val === '' || val == null) return <span className="stk stk-zero">—</span>;
  const n = Number(val);
  const cls = n < 0 ? 'stk-neg' : n > 0 ? 'stk-pos' : 'stk-zero';
  return <span className={`stk ${cls}`}>{n > 0 ? `+${n}` : n}</span>;
};

const NumInput: React.FC<{ value: number; onChange: (n: number) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <input type="number" className="vdm-input" min={0}
    style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}
    value={value || ''} placeholder={placeholder || '0'}
    onChange={e => onChange(Math.max(0, Number(e.target.value)))} />
);

// ─── Main component ───────────────────────────────────────────────────────────

const VendorDeptModule: React.FC = () => {
  const { toasts, show: toast } = useToast();

  // Inject styles once
  useEffect(() => {
    if (document.getElementById('vdm-css')) return;
    const el = document.createElement('style');
    el.id = 'vdm-css'; el.textContent = GLOBAL_STYLES;
    document.head.appendChild(el);
  }, []);

  // ── Data state ──────────────────────────────────────────────────────────
  const [userUid, setUserUid] = useState<string | null>(null);
  const [orders, setOrders] = useState<VendorDeptOrder[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [purchaseData, setPurchaseData] = useState<any[]>([]);
  const [vsirRecords, setVsirRecords] = useState<any[]>([]);
  const [psirData, setPsirData] = useState<any[]>([]);
  const [stockRecords, setStockRecords] = useState<any[]>([]);
  const [purchasePOs, setPurchasePOs] = useState<string[]>([]);

  // ── Form state ──────────────────────────────────────────────────────────
  const [newOrder, setNewOrder] = useState<VendorDeptOrder>({ ...BLANK_ORDER });
  const [itemInput, setItemInput] = useState<VendorDeptItem>({ ...BLANK_ITEM });
  const [editOrderIdx, setEditOrderIdx] = useState<number | null>(null);
  const [editItemIdx, setEditItemIdx] = useState<number | null>(null);

  // ── Filter state ────────────────────────────────────────────────────────
  const [filterOpen, setFilterOpen] = useState(false);
  const [fSearch, setFSearch] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  const editRef = useRef<HTMLDivElement>(null);

  // ── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => onAuthStateChanged(auth, u => setUserUid(u?.uid ?? null)), []);

  // ── Subscriptions ────────────────────────────────────────────────────────
  useEffect(() => { if (!userUid) return; return subscribeVendorDepts(userUid, setOrders); }, [userUid]);
  useEffect(() => { if (!userUid) return; return subscribeVSIRRecords(userUid, setVsirRecords); }, [userUid]);
  useEffect(() => { if (!userUid) return; return subscribePsirs(userUid, setPsirData); }, [userUid]);

  useEffect(() => {
    if (!userUid) return;
    Promise.all([getPurchaseOrders(userUid), getPurchaseData(userUid)])
      .then(([po, pd]) => {
        if (Array.isArray(po)) setPurchaseOrders(po);
        if (Array.isArray(pd)) setPurchaseData(pd);
      }).catch(() => {});
  }, [userUid]);

  // ── Stock ────────────────────────────────────────────────────────────────
  const reloadStock = useCallback(() => {
    try { const r = localStorage.getItem('stock-records'); if (r) setStockRecords(JSON.parse(r)); } catch {}
  }, []);

  useEffect(() => {
    reloadStock();
    const sh = (e: StorageEvent) => { if (e.key === 'stock-records') reloadStock(); };
    const bh = () => reloadStock();
    window.addEventListener('storage', sh);
    bus.addEventListener('stock.updated', bh as EventListener);
    return () => { window.removeEventListener('storage', sh); bus.removeEventListener('stock.updated', bh as EventListener); };
  }, [reloadStock]);

  // ── Derive PO list ───────────────────────────────────────────────────────
  useEffect(() => {
    const src = purchaseOrders.length > 0 ? purchaseOrders : purchaseData;
    const list = [...new Set(src.map((o: any) => o.poNo).filter(Boolean))] as string[];
    setPurchasePOs(list);
    if (list.length && !newOrder.materialPurchasePoNo)
      setNewOrder(p => ({ ...p, materialPurchasePoNo: list[list.length - 1] }));
  }, [purchaseOrders, purchaseData]); // eslint-disable-line

  // ── VSIR → orders sync ──────────────────────────────────────────────────
  useEffect(() => {
    if (!vsirRecords.length) return;
    setOrders(prev => prev.map(o => {
      let upd = { ...o };
      if (!o.vendorBatchNo?.trim()) {
        const vbn = getVendorBatchFromVSIR(o.materialPurchasePoNo, vsirRecords);
        if (vbn) upd.vendorBatchNo = vbn;
      }
      let changed = false;
      const items = o.items.map(it => {
        const v = vsirRecords.find(r => norm(r.poNo) === norm(o.materialPurchasePoNo) && norm(r.itemCode) === norm(it.itemCode));
        if (!v) return it;
        const nr = v.qtyReceived || 0, no = v.okQty || 0, nrw = v.reworkQty || 0, nrj = v.rejectQty || 0, ng = v.grnNo || '';
        if (nr !== it.receivedQty || no !== it.okQty || nrw !== it.reworkQty || nrj !== it.rejectedQty || ng !== it.grnNo) {
          changed = true;
          return { ...it, receivedQty: nr, okQty: no, reworkQty: nrw, rejectedQty: nrj, grnNo: ng };
        }
        return it;
      });
      if (changed) { upd.items = items; bus.dispatchEvent(new CustomEvent('vendorDept.updated', { detail: { source: 'vsir-sync' } })); }
      return changed || upd.vendorBatchNo !== o.vendorBatchNo ? upd : o;
    }));
  }, [vsirRecords]);

  // ── PSIR → batchNo backfill ──────────────────────────────────────────────
  useEffect(() => {
    if (!psirData.length) return;
    setOrders(prev => prev.map(o => {
      if (o.batchNo?.trim()) return o;
      const p = psirData.find((r: any) => r.poNo === o.materialPurchasePoNo);
      return p?.batchNo ? { ...o, batchNo: p.batchNo } : o;
    }));
  }, [psirData]);

  // ── Auto-import new POs ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userUid || !purchaseOrders.length) return;
    const existing = new Set(orders.map(o => norm(o.materialPurchasePoNo)));
    const grouped: Record<string, any[]> = {};
    purchaseOrders.forEach((e: any) => { if (!e.poNo) return; const k = norm(e.poNo); (grouped[k] = grouped[k] || []).push(e); });
    Object.entries(grouped).forEach(([nPo, group]) => {
      if (existing.has(nPo)) return;
      const first = group[0];
      const pr = psirData.find((p: any) => norm(p.poNo) === nPo);
      const vr = vsirRecords.find((v: any) => norm(v.poNo) === nPo);
      addVendorDept(userUid, {
        orderPlaceDate: first.orderPlaceDate || '', materialPurchasePoNo: first.poNo,
        oaNo: first.oaNo || '', batchNo: pr?.batchNo || '', vendorBatchNo: vr?.vendorBatchNo || '',
        dcNo: '', vendorName: '',
        items: group.map((item: any) => ({
          itemName: item.itemName || item.model || '', itemCode: item.itemCode || '', materialIssueNo: '',
          qty: item.qty || 0, indentStatus: (item.indentStatus || '').toUpperCase(),
          receivedQty: 0, okQty: item.okQty || 0, reworkQty: item.reworkQty || 0,
          rejectedQty: item.rejectedQty || 0, grnNo: item.grnNo || '',
          debitNoteOrQtyReturned: item.debitNoteOrQtyReturned || '', remarks: item.remarks || '',
        })),
      }).catch(() => {});
    });
  }, [purchaseOrders, userUid]); // eslint-disable-line

  // ── Form auto-fill on PO change ──────────────────────────────────────────
  useEffect(() => {
    const poNo = newOrder.materialPurchasePoNo;
    if (!poNo) return;
    const ex = orders.find(o => o.materialPurchasePoNo === poNo);
    const pr = getPSIRByPO(poNo, psirData);
    const vbn = getVendorBatchFromVSIR(poNo, vsirRecords);
    const supplier = !newOrder.vendorName && editOrderIdx === null ? getSupplierFromPO(poNo, purchaseOrders, purchaseData) : '';
    setNewOrder(prev => ({
      ...prev,
      orderPlaceDate: ex?.orderPlaceDate || pr?.receivedDate || prev.orderPlaceDate,
      oaNo: ex?.oaNo || pr?.oaNo || prev.oaNo,
      batchNo: ex?.batchNo || pr?.batchNo || prev.batchNo,
      vendorBatchNo: vbn || ex?.vendorBatchNo || prev.vendorBatchNo,
      ...(supplier ? { vendorName: supplier } : {}),
    }));
  }, [newOrder.materialPurchasePoNo, vsirRecords, psirData]); // eslint-disable-line

  // ── Item auto-fill from VSIR ─────────────────────────────────────────────
  useEffect(() => {
    if (!newOrder.materialPurchasePoNo || !itemInput.itemCode) return;
    const v = vsirRecords.find(r => norm(r.poNo) === norm(newOrder.materialPurchasePoNo) && norm(r.itemCode) === norm(itemInput.itemCode));
    if (!v) return;
    setItemInput(p => ({ ...p, receivedQty: v.qtyReceived || 0, okQty: v.okQty || v.qtyReceived || 0, reworkQty: v.reworkQty || 0, rejectedQty: v.rejectQty || 0, grnNo: v.grnNo || '' }));
  }, [newOrder.materialPurchasePoNo, itemInput.itemCode, vsirRecords]);

  // ── Item qty from purchase ───────────────────────────────────────────────
  useEffect(() => {
    if (!newOrder.materialPurchasePoNo || !itemInput.itemCode) return;
    setItemInput(p => ({ ...p, qty: getPurchaseQty(newOrder.materialPurchasePoNo, itemInput.itemCode, purchaseOrders, purchaseData) }));
  }, [newOrder.materialPurchasePoNo, itemInput.itemCode, purchaseOrders, purchaseData]);

  // ── Bus events ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setVsirRecords(p => [...p]);
    bus.addEventListener('vsir.updated', fn as EventListener);
    bus.addEventListener('vsir.records.synced', fn as EventListener);
    return () => { bus.removeEventListener('vsir.updated', fn as EventListener); bus.removeEventListener('vsir.records.synced', fn as EventListener); };
  }, []);

  // ── Derived memos ────────────────────────────────────────────────────────
  const stockMap = useMemo(() => {
    const m = new Map<string, number | string>();
    orders.forEach(o => o.items.forEach(it => {
      const k = `${it.itemCode}::${it.itemName}`;
      if (!m.has(k)) m.set(k, computeStock(matchStock(stockRecords, it.itemCode, it.itemName)));
    }));
    return m;
  }, [stockRecords, orders]);

  const getStock = useCallback((code?: string, name?: string): number | string => {
    const k = `${code}::${name}`;
    return stockMap.has(k) ? stockMap.get(k)! : computeStock(matchStock(stockRecords, code, name));
  }, [stockMap, stockRecords]);

  const statusMap = useMemo(() => {
    const m = new Map<string, string>();
    orders.forEach(o => o.items.forEach(it => {
      const k = `${o.materialPurchasePoNo}::${it.itemCode}::${it.materialIssueNo}`;
      if (!m.has(k)) m.set(k, (getIndentStatus(o.materialPurchasePoNo, it.itemCode, it.materialIssueNo, purchaseData, purchaseOrders) || it.indentStatus || '').toUpperCase());
    }));
    return m;
  }, [orders, purchaseData, purchaseOrders]);

  const poQtyMap = useMemo(() => {
    const m = new Map<string, number>();
    orders.forEach(o => o.items.forEach(it => {
      const k = `${o.materialPurchasePoNo}::${it.itemCode}`;
      if (!m.has(k)) m.set(k, Math.abs(getPurchaseQty(o.materialPurchasePoNo, it.itemCode, purchaseOrders, purchaseData)));
    }));
    return m;
  }, [orders, purchaseOrders, purchaseData]);

  type FlatRow = VendorDeptOrder & { _oi: number; _item: VendorDeptItem; _ii: number; _poQty: number; _stock: number | string; _status: string };

  const flatRows = useMemo((): FlatRow[] => {
    const rows: FlatRow[] = [];
    orders.forEach((o, oi) => {
      if (!o.items.length) {
        rows.push({ ...o, _oi: oi, _item: { ...BLANK_ITEM }, _ii: -1, _poQty: 0, _stock: '', _status: '' });
      } else {
        o.items.forEach((it, ii) => rows.push({
          ...o, _oi: oi, _item: it, _ii: ii,
          _poQty: poQtyMap.get(`${o.materialPurchasePoNo}::${it.itemCode}`) ?? 0,
          _stock: stockMap.get(`${it.itemCode}::${it.itemName}`) ?? getStock(it.itemCode, it.itemName),
          _status: statusMap.get(`${o.materialPurchasePoNo}::${it.itemCode}::${it.materialIssueNo}`) ?? '',
        }));
      }
    });
    return rows;
  }, [orders, poQtyMap, stockMap, statusMap, getStock]);

  const filtered = useMemo(() => {
    let rows = flatRows;
    if (fSearch.trim()) {
      const t = fSearch.trim().toUpperCase();
      rows = rows.filter(r => [r.materialPurchasePoNo, r.vendorName, r._item.itemName, r._item.itemCode, r.oaNo, r._item.grnNo].some(v => norm(v).includes(t)));
    }
    if (fStatus) rows = rows.filter(r => r._status === fStatus.toUpperCase());
    if (fFrom) rows = rows.filter(r => r.orderPlaceDate >= fFrom);
    if (fTo) rows = rows.filter(r => r.orderPlaceDate <= fTo);
    return rows;
  }, [flatRows, fSearch, fStatus, fFrom, fTo]);

  const activeFilters = [fSearch, fStatus, fFrom, fTo].filter(Boolean).length;

  const stats = useMemo(() => ({
    total: orders.length,
    items: orders.reduce((s, o) => s + o.items.length, 0),
    pending: orders.filter(o => o.items.some(it => !it.receivedQty)).length,
    received: flatRows.reduce((s, r) => s + (r._item.receivedQty || 0), 0),
    rejected: flatRows.reduce((s, r) => s + (r._item.rejectedQty || 0), 0),
  }), [orders, flatRows]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const clearForm = useCallback(() => {
    setNewOrder({ ...BLANK_ORDER }); setItemInput({ ...BLANK_ITEM });
    setEditOrderIdx(null); setEditItemIdx(null);
  }, []);

  const handleSaveItem = useCallback(() => {
    if (!itemInput.itemName || !itemInput.itemCode || !itemInput.materialIssueNo || itemInput.qty <= 0) {
      toast('Please fill Item Name, Code, Issue No and Qty (> 0)', 'e'); return;
    }
    const enriched = { ...itemInput, plannedQty: itemInput.qty, closingStock: getStock(itemInput.itemCode, itemInput.itemName) };
    if (editItemIdx !== null) {
      setNewOrder(p => ({ ...p, items: p.items.map((it, i) => i === editItemIdx ? enriched : it) }));
      setEditItemIdx(null);
    } else {
      setNewOrder(p => ({ ...p, items: [...p.items, enriched] }));
    }
    setItemInput({ ...BLANK_ITEM });
  }, [itemInput, editItemIdx, getStock, toast]);

  const handleAddOrder = useCallback(async () => {
    if (!newOrder.orderPlaceDate || !newOrder.materialPurchasePoNo || !newOrder.vendorName || !newOrder.items.length || !newOrder.dcNo) {
      toast('Please fill: Date, PO No, Vendor Name, DC No, and add at least one item', 'e'); return;
    }
    if (!newOrder.oaNo) { toast('OA No not yet populated — re-select the PO No', 'e'); return; }
    if (!newOrder.batchNo) { toast('Batch No not yet populated — re-select the PO No', 'e'); return; }
    if (!userUid) { toast('Not authenticated', 'e'); return; }
    const vbn = newOrder.vendorBatchNo || getVendorBatchFromVSIR(newOrder.materialPurchasePoNo, vsirRecords);
    try {
      await addVendorDept(userUid, { ...newOrder, vendorBatchNo: vbn });
      bus.dispatchEvent(new CustomEvent('vendorDept.updated', { detail: {} }));
      toast('Order saved successfully ✓', 's'); clearForm();
    } catch { toast('Failed to save order — please retry', 'e'); }
  }, [newOrder, vsirRecords, userUid, clearForm, toast]);

  const handleUpdateOrder = useCallback(async () => {
    if (editOrderIdx === null || !userUid || !orders[editOrderIdx]?.id) { toast('Cannot update: missing data', 'e'); return; }
    const { id, ...data } = newOrder;
    try {
      await updateVendorDept(userUid, orders[editOrderIdx].id!, data);
      bus.dispatchEvent(new CustomEvent('vendorDept.updated', { detail: {} }));
      toast('Order updated successfully ✓', 's'); clearForm();
    } catch { toast('Failed to update order — please retry', 'e'); }
  }, [editOrderIdx, userUid, orders, newOrder, clearForm, toast]);

  const handleDeleteOrder = useCallback(async (idx: number) => {
    if (!userUid || !orders[idx]?.id) return;
    if (!window.confirm('Delete this entire order?')) return;
    try { await deleteVendorDept(userUid, orders[idx].id!); toast('Order deleted', 's'); }
    catch { toast('Failed to delete order', 'e'); }
  }, [userUid, orders, toast]);

  const handleDeleteItem = useCallback(async (oi: number, ii: number) => {
    if (!userUid || !orders[oi]?.id) return;
    if (!window.confirm('Delete this item?')) return;
    const upd = { ...orders[oi], items: orders[oi].items.filter((_, i) => i !== ii) };
    try {
      if (!upd.items.length) await deleteVendorDept(userUid, orders[oi].id!);
      else { const { id, ...d } = upd; await updateVendorDept(userUid, orders[oi].id!, d); }
      toast('Item deleted', 's');
    } catch { toast('Failed to delete item', 'e'); }
  }, [userUid, orders, toast]);

  const handleEditOrder = useCallback((idx: number) => {
    const o = JSON.parse(JSON.stringify(orders[idx]));
    if (!o.vendorBatchNo?.trim()) { const vbn = getVendorBatchFromVSIR(o.materialPurchasePoNo, vsirRecords); if (vbn) o.vendorBatchNo = vbn; }
    setNewOrder(o); setItemInput({ ...BLANK_ITEM }); setEditOrderIdx(idx); setEditItemIdx(null);
    setTimeout(() => editRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, [orders, vsirRecords]);

  const handleManualSync = useCallback(() => {
    if (!orders.length) { toast('No orders to sync', 'i'); return; }
    let changed = false;
    const updated = orders.map(o => ({
      ...o, items: o.items.map(it => {
        const q = getPurchaseQty(o.materialPurchasePoNo, it.itemCode, purchaseOrders, purchaseData);
        if (q > 0 && !it.qty) { changed = true; return { ...it, qty: q }; } return it;
      }),
    }));
    if (changed) setOrders(updated);
    toast(changed ? 'Sync complete — empty quantities filled' : 'All quantities already populated', 'i');
  }, [orders, purchaseOrders, purchaseData, toast]);

  const clearFilters = () => { setFSearch(''); setFStatus(''); setFFrom(''); setFTo(''); };
  const isEditing = editOrderIdx !== null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="vdm">
      {/* Toasts */}
      <div className="vdm-toasts">
        {toasts.map(t => <div key={t.id} className={`vdm-toast toast-${t.type}`}>{t.msg}</div>)}
      </div>

      <div className="vdm-inner">

        {/* ── Page header + unified toolbar ────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: '#1a237e', letterSpacing: '-0.02em' }}>Vendor Dept</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#9ca3af', fontWeight: 500 }}>Purchase order tracking &amp; vendor management</p>
          </div>

          {/* Unified toolbar — filters + row count + sync + export all in one bar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div className="vdm-toolbar">
              {/* Filter toggle btn with badge */}
              <button
                className={`vdm-btn vdm-btn-sm ${activeFilters > 0 ? 'vdm-btn-indigo' : 'vdm-btn-ghost'}`}
                style={{ position: 'relative' }}
                onClick={() => setFilterOpen(p => !p)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                {activeFilters > 0 ? `Filters (${activeFilters})` : 'Filters'}
                {activeFilters > 0 && (
                  <span style={{ position: 'absolute', top: -7, right: -7, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 17, height: 17, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{activeFilters}</span>
                )}
              </button>

              <div className="vdm-divider-sm" />

              {/* Row count pill */}
              <span className="vdm-rowcount">
                {filtered.length === flatRows.length ? `${flatRows.length} rows` : `${filtered.length} / ${flatRows.length} rows`}
              </span>

              <div className="vdm-divider-sm" />

              {/* Sync */}
              <button className="vdm-btn vdm-btn-sm vdm-btn-ghost" onClick={handleManualSync} title="Fill empty quantities from purchase data">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/></svg>
                Sync
              </button>

              {/* Export — same row as filters */}
              <button className="vdm-btn vdm-btn-sm vdm-btn-success" onClick={() => exportCSV(filtered)} title={`Export ${filtered.length} rows as CSV`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export CSV
              </button>
            </div>

            {/* Active filter chips below toolbar */}
            {activeFilters > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                {fSearch && <span className="vdm-chip">🔍 "{fSearch}" <span className="vdm-chip-x" onClick={() => setFSearch('')}>×</span></span>}
                {fStatus && <span className="vdm-chip">Status: {fStatus} <span className="vdm-chip-x" onClick={() => setFStatus('')}>×</span></span>}
                {fFrom && <span className="vdm-chip">From: {fFrom} <span className="vdm-chip-x" onClick={() => setFFrom('')}>×</span></span>}
                {fTo && <span className="vdm-chip">To: {fTo} <span className="vdm-chip-x" onClick={() => setFTo('')}>×</span></span>}
                <button className="vdm-btn vdm-btn-xs vdm-btn-ghost" onClick={clearFilters}>Clear all</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Filter panel (inline, animated) ──────────────────────────── */}
        {filterOpen && (
          <div className="vdm-fpanel" style={{ marginBottom: 16 }}>
            <Field label="Search">
              <input className="vdm-input" style={{ minWidth: 210 }} autoFocus
                placeholder="PO No, vendor, item name, GRN…"
                value={fSearch} onChange={e => setFSearch(e.target.value)} />
            </Field>
            <Field label="Indent Status">
              <select className="vdm-input vdm-select" style={{ minWidth: 130 }} value={fStatus} onChange={e => setFStatus(e.target.value)}>
                <option value="">All statuses</option>
                {INDENT_STATUS_OPTIONS.map(s => <option key={s} value={s.toUpperCase()}>{s}</option>)}
              </select>
            </Field>
            <Field label="Date From">
              <input type="date" className="vdm-input" value={fFrom} onChange={e => setFFrom(e.target.value)} />
            </Field>
            <Field label="Date To">
              <input type="date" className="vdm-input" value={fTo} onChange={e => setFTo(e.target.value)} />
            </Field>
            <div style={{ alignSelf: 'flex-end', display: 'flex', gap: 8 }}>
              {activeFilters > 0 && <button className="vdm-btn vdm-btn-sm vdm-btn-ghost" onClick={clearFilters}>Clear all</button>}
              <button className="vdm-btn vdm-btn-sm vdm-btn-ghost" onClick={() => setFilterOpen(false)}>Close</button>
            </div>
          </div>
        )}

        {/* ── Stats bar ────────────────────────────────────────────────── */}
        <div className="vdm-card" style={{ marginBottom: 18, padding: '16px 24px' }}>
          <div className="vdm-stats">
            {[
              { val: stats.total, lbl: 'Orders', color: '#1a237e' },
              { val: stats.items, lbl: 'Line Items', color: '#1a237e' },
              { val: stats.pending, lbl: 'Pending', color: '#d97706' },
              { val: stats.received, lbl: 'Total Received', color: '#16a34a' },
              { val: stats.rejected, lbl: 'Total Rejected', color: stats.rejected > 0 ? '#ef4444' : '#9ca3af' },
            ].map((s, i) => (
              <React.Fragment key={s.lbl}>
                {i > 0 && <div className="vdm-divider-v" />}
                <div className="vdm-stat">
                  <div className="vdm-stat-val" style={{ color: s.color }}>{s.val}</div>
                  <div className="vdm-stat-lbl">{s.lbl}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Edit / Add panel ─────────────────────────────────────────── */}
        <div ref={editRef} className={`vdm-card ${isEditing ? 'vdm-card-edit' : ''}`} style={{ marginBottom: 20 }}>

          {/* Panel header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 22px', borderBottom: '1px solid #f0f1f5',
            background: isEditing ? '#eef2ff' : '#fafbff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 17 }}>{isEditing ? '✏️' : '＋'}</span>
              <span style={{ fontWeight: 700, fontSize: 14.5, color: isEditing ? '#1a237e' : '#374151' }}>
                {isEditing ? `Edit Order  —  PO ${newOrder.materialPurchasePoNo}` : 'New Order'}
              </span>
              {isEditing && (
                <span style={{ background: '#c7d2fe', color: '#3730a3', padding: '2px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.05em' }}>EDIT MODE</span>
              )}
            </div>
            {isEditing && <button className="vdm-btn vdm-btn-sm vdm-btn-ghost" onClick={clearForm}>✕ Discard</button>}
          </div>

          <div style={{ padding: '20px 22px' }}>

            {/* PO selector bar */}
            <div className="vdm-pobar">
              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>PO No</span>
              <select className="vdm-input vdm-select" style={{ maxWidth: 200, flex: '0 0 auto' }}
                value={newOrder.materialPurchasePoNo}
                onChange={e => setNewOrder(p => ({ ...p, materialPurchasePoNo: e.target.value }))}>
                <option value="">— Select PO No —</option>
                {purchasePOs.map(po => <option key={po} value={po}>{po}</option>)}
              </select>
              {newOrder.orderPlaceDate && <span className="vdm-pobar-meta">📅 <strong>{newOrder.orderPlaceDate}</strong></span>}
              {newOrder.oaNo && <span className="vdm-pobar-meta">OA: <strong>{newOrder.oaNo}</strong></span>}
              {newOrder.batchNo && <span className="vdm-pobar-meta">Batch: <strong>{newOrder.batchNo}</strong></span>}
            </div>

            {/* Order detail fields */}
            <div className="vdm-sec">Order Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
              <Field label="Vendor Name ✱">
                <input className="vdm-input vdm-input-accent" placeholder="e.g. Acme Components"
                  value={newOrder.vendorName} onChange={e => setNewOrder(p => ({ ...p, vendorName: e.target.value }))} />
              </Field>
              <Field label="DC No ✱">
                <input className="vdm-input vdm-input-accent" placeholder="Delivery Challan No"
                  value={newOrder.dcNo} onChange={e => setNewOrder(p => ({ ...p, dcNo: e.target.value }))} />
              </Field>
              <Field label="Vendor Batch No">
                <input className="vdm-input" placeholder="Auto-filled from VSIR"
                  value={newOrder.vendorBatchNo} onChange={e => setNewOrder(p => ({ ...p, vendorBatchNo: e.target.value }))} />
              </Field>
            </div>

            {/* Item entry */}
            <div style={{ background: '#f8f9fc', borderRadius: 10, border: '1px solid #e2e4ea', padding: '16px 18px', marginBottom: 16 }}>
              <div className="vdm-sec" style={{ paddingTop: 0 }}>
                {editItemIdx !== null ? '✏ Edit Item' : '+ Add Item'}
              </div>

              {/* Row 1: identity */}
              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Field label="Item Name">
                  <input className="vdm-input" placeholder="e.g. Jaw Carrier 02"
                    value={itemInput.itemName} onChange={e => setItemInput(p => ({ ...p, itemName: e.target.value }))} />
                </Field>
                <Field label="Item Code">
                  <input className="vdm-input" placeholder="e.g. JW-02"
                    value={itemInput.itemCode} onChange={e => setItemInput(p => ({ ...p, itemCode: e.target.value }))} />
                </Field>
                <Field label="Material Issue No">
                  <input className="vdm-input" value={itemInput.materialIssueNo}
                    onChange={e => setItemInput(p => ({ ...p, materialIssueNo: e.target.value }))} />
                </Field>
                <Field label="Indent Status">
                  <select className="vdm-input vdm-select" value={itemInput.indentStatus}
                    onChange={e => setItemInput(p => ({ ...p, indentStatus: e.target.value }))}>
                    <option value="">— Select —</option>
                    {INDENT_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>

              {/* Row 2: quantities */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginBottom: 12 }}>
                {(['qty', 'receivedQty', 'okQty', 'reworkQty', 'rejectedQty'] as const).map(k => {
                  const labels: Record<string, string> = { qty: 'Qty ✱', receivedQty: 'Received', okQty: 'OK', reworkQty: 'Rework', rejectedQty: 'Rejected' };
                  return (
                    <Field key={k} label={labels[k]}>
                      <NumInput value={itemInput[k] as number} onChange={n => setItemInput(p => ({ ...p, [k]: n }))} />
                    </Field>
                  );
                })}
                <Field label="GRN No">
                  <input className="vdm-input" value={itemInput.grnNo} onChange={e => setItemInput(p => ({ ...p, grnNo: e.target.value }))} />
                </Field>
                <Field label="Debit / Returned">
                  <input className="vdm-input" value={itemInput.debitNoteOrQtyReturned} onChange={e => setItemInput(p => ({ ...p, debitNoteOrQtyReturned: e.target.value }))} />
                </Field>
              </div>

              {/* Row 3: remarks + action */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <Field label="Remarks" style={{ flex: '1 1 200px' }}>
                  <input className="vdm-input" value={itemInput.remarks} onChange={e => setItemInput(p => ({ ...p, remarks: e.target.value }))} />
                </Field>
                <div style={{ display: 'flex', gap: 8, paddingBottom: 1 }}>
                  <button className="vdm-btn vdm-btn-primary" onClick={handleSaveItem}>
                    {editItemIdx !== null ? '✓ Update Item' : '+ Add Item'}
                  </button>
                  {editItemIdx !== null && (
                    <button className="vdm-btn vdm-btn-ghost" onClick={() => { setEditItemIdx(null); setItemInput({ ...BLANK_ITEM }); }}>Cancel</button>
                  )}
                </div>
              </div>
            </div>

            {/* Items preview */}
            {newOrder.items.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8b95a1', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  Items in this order ({newOrder.items.length})
                </div>
                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e4ea' }}>
                  <table className="vdm-itable">
                    <thead>
                      <tr>
                        {['Item Name', 'Code', 'Issue No', 'Qty', 'Status', 'Rcvd', 'OK', 'Rework', 'Rejected', 'GRN', ''].map((h, i) => (
                          <th key={i} className={i >= 5 && i <= 9 ? 'r' : ''}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {newOrder.items.map((it, ii) => (
                        <tr key={ii}>
                          <td><span className="ellipsis" style={{ maxWidth: 150 }} title={it.itemName}>{it.itemName}</span></td>
                          <td><span className="mono" style={{ color: '#6366f1' }}>{it.itemCode}</span></td>
                          <td style={{ color: '#6b7280' }}>{it.materialIssueNo || '—'}</td>
                          <td className="r" style={{ fontWeight: 600 }}>{it.qty}</td>
                          <td><StatusBadge status={it.indentStatus} /></td>
                          <td className="r">{it.receivedQty || '—'}</td>
                          <td className="r" style={{ color: '#16a34a', fontWeight: 600 }}>{it.okQty || '—'}</td>
                          <td className="r" style={{ color: '#d97706' }}>{it.reworkQty || '—'}</td>
                          <td className="r" style={{ color: '#ef4444' }}>{it.rejectedQty || '—'}</td>
                          <td><span className="mono">{it.grnNo || '—'}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="vdm-btn vdm-btn-xs vdm-btn-warning" onClick={() => { setItemInput(it); setEditItemIdx(ii); }}>Edit</button>
                              <button className="vdm-btn vdm-btn-xs vdm-btn-danger" onClick={() => setNewOrder(p => ({ ...p, items: p.items.filter((_, xi) => xi !== ii) }))}>✕</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Save order */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className={`vdm-btn ${isEditing ? 'vdm-btn-primary' : 'vdm-btn-success'}`} style={{ minWidth: 160 }}
                onClick={isEditing ? handleUpdateOrder : handleAddOrder}>
                {isEditing ? '✓ Save Changes' : '+ Add Order'}
              </button>
              {isEditing && <button className="vdm-btn vdm-btn-ghost" onClick={clearForm}>Discard</button>}
            </div>

          </div>
        </div>

        {/* ── Orders table ──────────────────────────────────────────────── */}
        <div className="vdm-card">
          <div style={{ padding: '13px 20px', borderBottom: '1px solid #f0f1f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1a237e' }}>Orders</span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              {activeFilters > 0 ? `Filtered: ${filtered.length} of ${flatRows.length}` : `${flatRows.length} total rows`}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="vdm-table">
              <colgroup>
                <col style={{ width: 34 }} /><col style={{ width: 130 }} /><col style={{ width: 88 }} />
                <col style={{ width: 98 }} /><col style={{ width: 82 }} /><col style={{ width: 108 }} />
                <col style={{ width: 62 }} /><col style={{ width: 62 }} /><col style={{ width: 58 }} />
                <col style={{ width: 52 }} /><col style={{ width: 58 }} /><col style={{ width: 62 }} />
                <col style={{ width: 78 }} /><col style={{ width: 60 }} /><col style={{ width: 88 }} />
                <col style={{ width: 88 }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="r">#</th>
                  <th>Item</th>
                  <th>Code</th>
                  <th>PO No</th>
                  <th>OA No</th>
                  <th>Vendor</th>
                  <th className="r">PO Qty</th>
                  <th className="r div-l">Planned</th>
                  <th className="r">Rcvd</th>
                  <th className="r">OK</th>
                  <th className="r">Rework</th>
                  <th className="r div-l">Rejected</th>
                  <th>GRN No</th>
                  <th className="r">Stock</th>
                  <th>Status</th>
                  <th className="r">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={16}>
                      <div className="vdm-empty">
                        <div className="vdm-empty-icon">📦</div>
                        <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4, fontSize: 14 }}>
                          {activeFilters > 0 ? 'No rows match your filters' : 'No orders yet'}
                        </div>
                        <div style={{ fontSize: 12.5 }}>
                          {activeFilters > 0
                            ? <span>Try <span style={{ color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }} onClick={clearFilters}>clearing filters</span> to see all orders</span>
                            : 'Add your first order using the form above'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((row, ri) => {
                  const empty = row._ii === -1;
                  return (
                    <tr key={`${row._oi}-${row._ii}`}>
                      <td className="r" style={{ color: '#c4c9d4', fontWeight: 700, fontSize: 11 }}>{ri + 1}</td>
                      <td>
                        <span className="ellipsis" style={{ maxWidth: 118, fontWeight: 500 }} title={row._item.itemName}>
                          {row._item.itemName || <span style={{ color: '#d1d5db' }}>—</span>}
                        </span>
                      </td>
                      <td><span className="mono" style={{ color: '#6366f1' }}>{row._item.itemCode || '—'}</span></td>
                      <td><span style={{ fontWeight: 600, fontSize: 12.5, color: '#1a237e' }}>{row.materialPurchasePoNo}</span></td>
                      <td style={{ color: '#6b7280', fontSize: 12 }}>{row.oaNo || '—'}</td>
                      <td>
                        <span className="ellipsis" style={{ maxWidth: 96 }} title={row.vendorName}>
                          {row.vendorName || <span style={{ color: '#d1d5db' }}>—</span>}
                        </span>
                      </td>
                      <td className="r" style={{ fontWeight: 600 }}>{empty ? '—' : row._poQty || '—'}</td>
                      <td className="r div-l" style={{ color: '#6b7280' }}>{row._item.plannedQty ?? '—'}</td>
                      <td className="r">{row._item.receivedQty || '—'}</td>
                      <td className="r" style={{ color: '#16a34a', fontWeight: 600 }}>{row._item.okQty || '—'}</td>
                      <td className="r" style={{ color: '#d97706' }}>{row._item.reworkQty || '—'}</td>
                      <td className="r div-l" style={{ color: '#ef4444', fontWeight: 600 }}>{row._item.rejectedQty || '—'}</td>
                      <td><span className="mono" style={{ color: '#6b7280', fontSize: 11 }}>{row._item.grnNo || '—'}</span></td>
                      <td className="r"><StockBadge val={row._stock} /></td>
                      <td><StatusBadge status={row._status} /></td>
                      <td className="r">
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                          <button className="vdm-btn vdm-btn-xs vdm-btn-primary" onClick={() => handleEditOrder(row._oi)}>Edit</button>
                          <button className="vdm-btn vdm-btn-xs vdm-btn-danger"
                            onClick={() => empty ? handleDeleteOrder(row._oi) : handleDeleteItem(row._oi, row._ii)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VendorDeptModule;
>>>>>>> ea2b60370e32f18454b4b30c524aa7881340b2ee
