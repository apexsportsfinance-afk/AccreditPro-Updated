import React, { useState } from "react";
import { Download, FileSpreadsheet, FileText, Edit, CheckCircle, Mail, Image as ImageIcon } from "lucide-react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import SearchableSelect from "../ui/SearchableSelect";
import { exportToExcel, exportTableToPDF } from "./ExportUtils";
import { bulkDownloadPDFs } from "./cardExport";
import ComposeEmailModal from "./ComposeEmailModal";
import { bulkDownloadPhotos } from "../../lib/imageDownload";


export default function BulkOperations({ 
  selectedRows, 
  filteredData, 
  event, 
  zones, 
  onClearSelection,
  onOpenBulkEdit,
  onBulkApprove,
  eventCategories = [],
  clubs = []
}) {
  const [downloading, setDownloading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [downloadingPhotos, setDownloadingPhotos] = useState(false);

  const selectAllFiltered = () => onClearSelection(filteredData.map(r => r.id));

  const handleBulkDownload = async () => {
    if (selectedRows.length === 0) return;
    setDownloading(true);
    try {
      const selectedData = filteredData.filter(r => selectedRows.includes(r.id));
      
      // await prewarmCache(urlsToWarm);

      await bulkDownloadPDFs(selectedData, event, zones, "a6");
    } catch (err) {
      console.error("Bulk download error:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleBulkDownloadPhotos = async () => {
    if (selectedRows.length === 0) return;
    setDownloadingPhotos(true);
    try {
      const selectedData = filteredData.filter(r => selectedRows.includes(r.id));
      const count = await bulkDownloadPhotos(selectedData, event?.name || "event");
    } catch (err) {
      console.error("Bulk photo download error:", err);
    } finally {
      setDownloadingPhotos(false);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = selectedRows.length > 0 
      ? filteredData.filter(r => selectedRows.includes(r.id)) 
      : filteredData;
    exportToExcel(dataToExport, `accreditations-${event?.name || "export"}`);
  };

  const handleExportPDF = async () => {
    const dataToExport = selectedRows.length > 0 
      ? filteredData.filter(r => selectedRows.includes(r.id)) 
      : filteredData;
    const columns = [
      { key: "accreditationId", header: "ID" }, 
      { key: "badgeNumber", header: "Badge" },
      { key: "firstName", header: "First Name" }, 
      { key: "lastName", header: "Last Name" },
      { key: "role", header: "Role" }, 
      { key: "club", header: "Club" },
      { key: "nationality", header: "Country" }, 
      { key: "status", header: "Status" },
    ];
    await exportTableToPDF(dataToExport, columns, "Accreditations List");
  };


  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 relative z-30">
        <div className="flex items-center gap-2 mr-auto">
          <span className="text-slate-300 font-medium">{selectedRows.length} selected</span>
          {selectedRows.length > 0 && (
            <button 
              onClick={() => onClearSelection([])} 
              className="text-lg text-cyan-400 hover:text-cyan-300"
            >
              Clear
            </button>
          )}
          <button 
            onClick={selectAllFiltered} 
            className="text-lg text-cyan-400 hover:text-cyan-300 ml-2"
          >
            Select All ({filteredData.length})
          </button>
        </div>

        {selectedRows.length > 0 && (
          <div className="flex items-center gap-3">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                console.log("BulkOperations: Opening Edit Modal for", selectedRows.length, "records");
                onOpenBulkEdit();
              }} 
              icon={Edit}
              className="cursor-pointer pointer-events-auto"
            >
              Bulk Edit
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                console.log("BulkOperations: Triggering bulk approve for", selectedRows.length, "records");
                onBulkApprove();
              }}
              icon={CheckCircle}
              className="cursor-pointer pointer-events-auto"
            >
              Bulk Approve
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleBulkDownload} 
              loading={downloading} 
              icon={Download}
            >
              Download Cards
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEmailModal(true)}
              icon={Mail}
            >
              Bulk Email
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkDownloadPhotos}
              loading={downloadingPhotos}
              icon={ImageIcon}
            >
              Download Photos
            </Button>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleExportExcel} icon={FileSpreadsheet}>
          Export Excel
        </Button>
        <Button variant="ghost" size="sm" onClick={handleExportPDF} icon={FileText}>
          Export PDF
        </Button>
      </div>

      {/* Bulk Email Compose Modal */}
      <ComposeEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        recipients={filteredData.filter(r => selectedRows.includes(r.id))}
        event={event}
        zones={zones}
        isBulk={true}
      />
    </>
  );
}