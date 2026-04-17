import React, { createContext, useContext, useState, useEffect } from "react";
import { AccreditationsAPI } from "../lib/storage";
import { generatePdfAttachment } from "../lib/pdfEmailHelper";
import { sendApprovalEmail } from "../lib/email";

const BackgroundContext = createContext();

export const useBackground = () => {
  const context = useContext(BackgroundContext);
  if (!context) throw new Error("useBackground must be used within a BackgroundProvider");
  return context;
};

export const BackgroundProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);

  const addToQueue = (task) => {
    setQueue(prev => [...prev, task]);
  };

  useEffect(() => {
    if (!processing && queue.length > 0) {
      processNext();
    }
  }, [queue, processing]);

  const processNext = async () => {
    setProcessing(true);
    const task = queue[0];
    setCurrentTask(task);

    try {
      const { id, accreditation, eventId, approveData, onSuccess } = task;
      
      const { data: updated, error } = await AccreditationsAPI.update(id, {
        status: "approved",
        approvedAt: new Date().toISOString(),
        zoneCodes: approveData.zoneCodes
      });

      if (error) throw error;

      if (approveData.sendEmail) {
        // Mocking/fetching event data if needed, or using passed data
        // For simplicity in this bridge, we assume generatePdfAttachment handles it
        const { pdfBlob, pdfName } = await generatePdfAttachment(updated, null); 
        await sendApprovalEmail(updated, null, pdfBlob, pdfName);
      }

      if (onSuccess) onSuccess(updated);
    } catch (err) {
      console.error("[BackgroundQueue] Task failed:", err);
    } finally {
      setQueue(prev => prev.slice(1));
      setCurrentTask(null);
      setProcessing(false);
    }
  };

  return (
    <BackgroundContext.Provider value={{ queue, addToQueue, currentTask, processing }}>
      {children}
    </BackgroundContext.Provider>
  );
};
