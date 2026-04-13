import { createContext, useContext, useState, useCallback, useRef } from 'react';
import api from '../services/api';

const ExtractionContext = createContext();

export function ExtractionProvider({ children }) {
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const processingRef = useRef(false);
  const abortRef = useRef(false);

  const addFiles = useCallback((fileList) => {
    const pdfs = Array.from(fileList).filter(f => f.type === 'application/pdf');
    if (pdfs.length === 0) return;
    abortRef.current = false;

    const newItems = pdfs.map((f, i) => ({
      id: Date.now() + '_' + i,
      file: f,
      fileName: f.name,
      status: 'queued',
      result: null,
      form: null,
      error: null,
    }));

    setItems(prev => {
      const updated = [...prev, ...newItems];
      // Trigger processing if not already running
      if (!processingRef.current) {
        processQueue(newItems);
      }
      return updated;
    });
  }, []);

  const processQueue = async (newOnes) => {
    processingRef.current = true;
    abortRef.current = false;
    for (const item of newOnes) {
      if (abortRef.current) break;
      await extractOne(item.id, item.file);
    }
    processingRef.current = false;
  };

  const extractOne = async (id, file) => {
    if (abortRef.current) return;
    setItems(prev => prev.map(it => it.id === id ? { ...it, status: 'extracting' } : it));

    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/ai/extract-invoice', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (data.garbled) {
        setItems(prev => prev.map(it => it.id === id ? { ...it, status: 'garbled', result: data } : it));
      } else {
        setItems(prev => prev.map(it => it.id === id ? {
          ...it, status: 'done', result: data,
          form: {
            clientName: data.data.clientName || '',
            amount: data.data.amount || data.data.totalTTC || '',
            issueDate: data.data.issueDate || '',
            dueDate: data.data.dueDate || '',
            description: data.data.description || '',
            reference: data.data.invoiceNumber || '',
            category: data.data.category || data.aiVerification?.corrections?.category || '',
            originalPdf: data.originalPdf || '',
            extractedBy: 'ai',
            status: 'pending',
          },
        } : it));
      }
    } catch (err) {
      setItems(prev => prev.map(it => it.id === id ? { ...it, status: 'error', error: err.response?.data?.message || 'Failed' } : it));
    }
  };

  const updateForm = useCallback((id, field, value) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, form: { ...it.form, [field]: value } } : it));
  }, []);

  const saveOne = useCallback(async (id) => {
    const item = items.find(it => it.id === id);
    if (!item?.form) return;
    try {
      await api.post('/invoices', { ...item.form, amount: Number(item.form.amount) });
      setItems(prev => prev.map(it => it.id === id ? { ...it, status: 'saved' } : it));
      return true;
    } catch {
      return false;
    }
  }, [items]);

  const saveAll = useCallback(async () => {
    const toSave = items.filter(it => it.status === 'done' && it.form?.clientName && it.form?.amount);
    for (const item of toSave) {
      await saveOne(item.id);
    }
  }, [items, saveOne]);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(it => it.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    abortRef.current = true;
    processingRef.current = false;
    setItems([]);
    setExpandedId(null);
  }, []);

  const retryOne = useCallback((id) => {
    const item = items.find(it => it.id === id);
    if (item) extractOne(id, item.file);
  }, [items]);

  const startManual = useCallback((id) => {
    setItems(prev => prev.map(it => it.id === id ? {
      ...it, status: 'done', result: { data: {}, confidence: { overall: 0 }, warnings: [] },
      form: { clientName: '', amount: '', issueDate: new Date().toISOString().split('T')[0], dueDate: '', description: '', reference: '', status: 'pending' },
    } : it));
    setExpandedId(id);
  }, []);

  const setBulkInvoiceStatus = useCallback((invoiceStatus) => {
    setItems(prev => prev.map(it => it.status === 'done' && it.form ? { ...it, form: { ...it.form, status: invoiceStatus } } : it));
  }, []);

  const selectAllToggle = useCallback(() => {
    // Not really "select" — just a helper. We handle it in the UI.
  }, []);

  return (
    <ExtractionContext.Provider value={{
      items, expandedId, setExpandedId,
      addFiles, updateForm, saveOne, saveAll, removeItem, clearAll, retryOne, startManual, setBulkInvoiceStatus,
    }}>
      {children}
    </ExtractionContext.Provider>
  );
}

export const useExtraction = () => useContext(ExtractionContext);
