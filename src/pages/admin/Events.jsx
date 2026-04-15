import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Link as LinkIcon,
  Copy,
  Check,
  ExternalLink,
  Upload,
  FileImage,
  Image as ImageIcon,
  Tags,
  Search,
  ChevronDown,
  PlusCircle,
  X,
  FileText,
  AlertCircle,
  ChevronLeft,
  ArrowRight,
  Users,
  Trophy,
  CheckCircle2,
  Activity,
  Download,
  Palette
} from "lucide-react";
import * as XLSX from "xlsx";
import { extractTextFromPdf as parsePDFText } from "../../lib/pdfParser";
import Button from "../../components/ui/Button";
import Card, { CardHeader, CardContent } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/Toast";
import { EventsAPI, AccreditationsAPI, EventCategoriesAPI, CategoriesAPI } from "../../lib/storage";
import { GlobalSettingsAPI } from "../../lib/broadcastApi";
import { formatDate, fileToBase64, cn } from "../../lib/utils";
const DOCUMENT_OPTIONS = [
  { id: "picture", label: "Picture" },
  { id: "passport", label: "Passport" },
  { id: "eid", label: "EID (Emirates ID)" },
  { id: "guardian_id", label: "Parent or Guardian ID" }
];

const COLOR_PRESETS = [
  "#2563eb", "#7c3aed", "#0d9488", "#d97706", "#e11d48",
  "#475569", "#b45309", "#059669", "#dc2626", "#1d4ed8",
  "#6d28d9", "#0369a1", "#047857", "#b91c1c", "#0891b2"
];

const toProperCase = (str) => {
  if (!str) return "";
  return str.toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase());
};

export default function Events() {
  const { id, subpage } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [eventCounts, setEventCounts] = useState({});
  const [editingEvent, setEditingEvent] = useState(null);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [shareModal, setShareModal] = useState({ open: false, slug: "" });
  const [deleteModal, setDeleteModal] = useState({ open: false, event: null });
  const [deleting, setDeleting] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "",
    ageCalculationYear: new Date().getFullYear(),
    registrationOpen: true,
    reportingTimes: "",
    headerArabic: "",
    headerSubtitle: "",
    logoUrl: "",
    backTemplateUrl: "",
    sponsorLogos: [],
    requiredDocuments: ["picture", "passport"]
  });
  const [localClosedMessage, setLocalClosedMessage] = useState("");
  const [isSavingMessage, setIsSavingMessage] = useState(false);

  useEffect(() => {
    if (id && events.length > 0) {
      const event = events.find(e => e.id === id);
      if (event) {
        setLocalClosedMessage(prev => {
          // Only update if it's currently empty or if it's different from what we have 
          // (avoiding overwriting while typing, although blur/save usually handles this)
          if (!prev || prev !== event.registrationClosedMessage) {
            return event.registrationClosedMessage || "";
          }
          return prev;
        });
      }
    }
  }, [id, events]);

  const toast = useToast();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
    loadCategories();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await EventsAPI.getAll();
      setEvents(data);
      if (data.length > 0) {
        const eventIds = data.map(e => e.id);
        const counts = await AccreditationsAPI.getCountsByEventIds(eventIds);
        setEventCounts(counts);
      }
    } catch (error) {
      console.error("Failed to load events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    const cats = await CategoriesAPI.getActive();
    setAvailableCategories(cats);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      startDate: "",
      endDate: "",
      location: "",
      ageCalculationYear: new Date().getFullYear(),
      registrationOpen: true,
      reportingTimes: "",
      headerArabic: "",
      headerSubtitle: "",
      logoUrl: "",
      backTemplateUrl: "",
      sponsorLogos: [],
      requiredDocuments: ["picture", "passport"]
    });
    setEditingEvent(null);
  };

  const handleOpenModal = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        name: event.name,
        slug: event.slug,
        description: event.description || "",
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        ageCalculationYear: event.ageCalculationYear,
        registrationOpen: event.registrationOpen,
        reportingTimes: event.reportingTimes || "",
        headerArabic: event.headerArabic || "",
        headerSubtitle: event.headerSubtitle || "",
        logoUrl: event.logoUrl || "",
        backTemplateUrl: event.backTemplateUrl || "",
        sponsorLogos: event.sponsorLogos || [],
        requiredDocuments: event.requiredDocuments || ["picture", "passport"]
      });
    } else {
      resetForm();
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name)
    }));
  };


  const toggleDocumentRequired = (docId) => {
    setFormData((prev) => {
      const current = prev.requiredDocuments || [];
      if (current.includes(docId)) {
        return { ...prev, requiredDocuments: current.filter(id => id !== docId) };
      } else {
        return { ...prev, requiredDocuments: [...current, docId] };
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.slug || !formData.startDate || !formData.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!formData.requiredDocuments || formData.requiredDocuments.length === 0) {
      toast.error("Please select at least one required document");
      return;
    }
    const saveEvent = async () => {
      try {
        if (editingEvent) {
          const dataToUpdate = { ...formData };
          if (formData.slug === editingEvent.slug) {
            delete dataToUpdate.slug;
          }
          await EventsAPI.update(editingEvent.id, dataToUpdate);
          toast.success("Event updated successfully");
        } else {
          await EventsAPI.create(formData);
          toast.success("Event created successfully");
        }
        handleCloseModal();
        loadEvents();
      } catch (error) {
        console.error("Save event error:", error);
        if (error?.code === "23505" || (error?.message && error.message.includes("duplicate key"))) {
          toast.error("This URL slug is already in use. Please choose a different slug.");
        } else {
          toast.error("Failed to save event: " + (error?.message || "Unknown error"));
        }
      }
    };
    saveEvent();
  };

  const handleDelete = async (event) => {
    setDeleteModal({ open: true, event });
  };

  const confirmDelete = async () => {
    if (!deleteModal.event) return;
    setDeleting(true);
    try {
      await EventsAPI.delete(deleteModal.event.id);
      toast.success("Event and all related data deleted successfully");
      setDeleteModal({ open: false, event: null });
      await loadEvents();
    } catch (error) {
      console.error("Delete event error:", error);
      toast.error("Failed to delete event: " + (error.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };


  const getRegistrationLink = (slug) => {
    return `${window.location.origin}/register/${slug}`;
  };

  const copyRegistrationLink = async (slug) => {
    const link = getRegistrationLink(slug);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
        setCopiedSlug(slug);
        toast.success("Registration link copied to clipboard");
        setTimeout(() => setCopiedSlug(null), 2000);
      } else {
        setShareModal({ open: true, slug });
      }
    } catch {
      toast.info("Please copy the link manually");
    }
  };

  const openClubsModal = async (event) => {
    setSelectedEventForClubs(event);
    setParsedClubs([]);
    setClubsModalOpen(true);
    
    // Load existing clubs if any
    try {
      const clubsStr = await GlobalSettingsAPI.get(`event_${event.id}_clubs`);
      if (clubsStr) {
        setParsedClubs(JSON.parse(clubsStr));
      }
    } catch (err) {
      console.error("Failed to load existing clubs:", err);
    }
  };

  const handleClubsFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop().toLowerCase();
    setParsingClubs(true);

    try {
      let clubs = [];
      if (extension === 'csv' || extension === 'xlsx') {
        const XLSX = await import("xlsx");
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            
            // SS 1 logic: Column P (index 15) is Short Name, Column Q (index 16) is Full Name
            // Fallback to searching for "club" in header if columns P/Q aren't present
            let shortNameIdx = 15;
            let fullNameIdx = 16;
            
            if (data[0] && data[0].length < 17) {
              const header = data[0].map(h => String(h).toLowerCase());
              const foundIndex = header.indexOf("club");
              if (foundIndex !== -1) {
                shortNameIdx = foundIndex;
                fullNameIdx = foundIndex;
              } else {
                shortNameIdx = 0;
                fullNameIdx = 0;
              }
            }

            const extracted = data.slice(1)
              .map(row => {
                const short = String(row[shortNameIdx] || "").trim();
                const full = String(row[fullNameIdx] || "").trim();
                if (!full) return null;
                return full;
              })
              .filter(val => val && val.length > 0);
            
            const uniqueClubs = [...new Set(extracted)].sort();
            setParsedClubs(uniqueClubs);
            toast.success(`Extracted ${uniqueClubs.length} unique clubs`);
            setParsingClubs(false);
          } catch (err) {
            console.error("XLSX parse error:", err);
            toast.error("Failed to parse file");
            setParsingClubs(false);
          }
        };
        reader.readAsBinaryString(file);
      } else if (extension === 'pdf') {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map(item => item.str).join(" ");
        }

        // SS 2 logic: Under "Team" heading, pattern is [Serial] [ShortName] [FullName]
        // Search for the "Team" column and extract lines that look like [Num] [Code] [Name]
        const teamMatch = fullText.match(/Team\s+Relays\s+Athletes/i);
        let extractedClubs = [];
        
        if (teamMatch) {
          const tableText = fullText.substring(teamMatch.index);
          // Regex to match Serial (1-3 digits), Code (2-6 uppercase/chars), Name (rest of line until next num)
          // Simplified: split into lines and find rows starting with a number
          const lines = tableText.split(/\n|\s{3,}/).map(l => l.trim()).filter(l => l.length > 5);
          lines.forEach(line => {
            const parts = line.split(/\s+/);
            if (parts.length >= 3 && /^\d+$/.test(parts[0]) && parts[1].length >= 2 && parts[1].toUpperCase() === parts[1]) {
              const short = parts[1];
              const full = parts.slice(2).join(" ");
              // Guard against capturing the whole line with numbers at end (Relays, Athletes, etc)
              // We know athletes/entries follow. Usually they are separated by more space.
              // Taking only the text parts.
              const cleanFull = full.split(/\d+/)[0].trim();
              if (cleanFull) {
                extractedClubs.push(cleanFull);
              }
            }
          });
        }

        if (extractedClubs.length === 0) {
          // Fallback to basic extraction
          const lines = fullText.split(/\s{2,}|\n/).map(l => l.trim()).filter(l => l.length > 3);
          extractedClubs = [...new Set(lines)];
        }

        const uniqueClubs = [...new Set(extractedClubs)].sort();
        setParsedClubs(uniqueClubs);
        toast.success(`Extracted ${uniqueClubs.length} potential club entries from PDF`);
        setParsingClubs(false);
      } else {
        toast.error("Unsupported file format");
        setParsingClubs(false);
      }
    } catch (err) {
      console.error("File upload error:", err);
      toast.error("Failed to process file");
      setParsingClubs(false);
    }
  };

  const saveClubsList = async () => {
    if (!selectedEventForClubs || parsedClubs.length === 0) return;
    setSavingClubs(true);
    try {
      await GlobalSettingsAPI.set(`event_${selectedEventForClubs.id}_clubs`, JSON.stringify(parsedClubs));
      toast.success("Clubs list updated successfully");
      setClubsModalOpen(false);
    } catch (err) {
      console.error("Save clubs error:", err);
      toast.error("Failed to save clubs list");
    } finally {
      setSavingClubs(false);
    }
  };

  const removeClub = (index) => {
    setParsedClubs(prev => prev.filter((_, i) => i !== index));
  };

  const clearClubs = async () => {
    if (!selectedEventForClubs) return;
    if (!window.confirm("Are you sure you want to clear the clubs list for this event?")) return;
    
    try {
      await GlobalSettingsAPI.remove(`event_${selectedEventForClubs.id}_clubs`);
      setParsedClubs([]);
      toast.success("Clubs list cleared");
    } catch (err) {
      toast.error("Failed to clear list");
    }
  };

  const handleManualCopy = () => {
    const link = getRegistrationLink(shareModal.slug);
    const input = document.getElementById("share-link-input");
    if (input) {
      input.select();
      input.setSelectionRange(0, link.length);
      try {
        document.execCommand("copy");
        toast.success("Link copied to clipboard");
        setShareModal({ open: false, slug: "" });
      } catch {
        toast.info("Please copy the link manually using Ctrl+C / Cmd+C");
      }
    }
  };

  const getDocumentLabel = (docIds) => {
    if (!docIds || docIds.length === 0) return "None selected";
    if (docIds.length === DOCUMENT_OPTIONS.length) return "All documents";
    return docIds.map(id => {
      const doc = DOCUMENT_OPTIONS.find(d => d.id === id);
      return doc ? doc.label : id;
    }).join(", ");
  };

  return (
    <div id="events_page" className="space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {id && (
            <button 
              onClick={() => navigate("/admin/events")} 
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all shadow-xl border border-white/5 group"
              title="Back to all events"
            >
              <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            </button>
          )}
          <div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight uppercase italic">
              {id ? "Event Console" : "Competition events"}
            </h1>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-[0.2em]">
              {id ? "Operational Command Center" : "Global event management system"}
            </p>
          </div>
        </div>
        {!id && (
          <Button 
            icon={Plus} 
            onClick={() => handleOpenModal()}
            className="bg-primary-500 hover:bg-primary-400 text-white shadow-lg shadow-primary-500/20 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest"
          >
            Initiate New Event
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-white/5 rounded-3xl animate-pulse border border-white/5" />
            ))}
          </div>
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Active Events"
          description="Ready to start? Initialize your first competition event to begin processing accreditations."
          action={() => handleOpenModal()}
          actionLabel="Create Event"
          actionIcon={Plus}
        />
      ) : !id ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/admin/events/${event.id}`)}
              className="group"
            >
              <Card className="h-full group-hover:border-primary-500/30 group-hover:bg-white/[0.05] transition-all cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-primary-500/10 transition-colors" />
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 group-hover:scale-110 group-hover:bg-primary-500 group-hover:text-white transition-all shadow-lg">
                      <Calendar className="w-7 h-7" />
                    </div>
                    <div className="flex flex-col items-end">
                      <Badge variant={event.registrationOpen ? "success" : "warning"} className="mb-2">
                        {event.registrationOpen ? "Live" : "Paused"}
                      </Badge>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {formatDate(event.startDate).split(' ')[1]} {formatDate(event.startDate).split(' ')[2]}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight group-hover:text-primary-400 transition-colors line-clamp-2">
                    {event.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-1 rounded-full bg-slate-600" />
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{event.location}</p>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex -space-x-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-500">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                      ))}
                      <div className="w-8 h-8 rounded-full bg-primary-500/10 border-2 border-slate-900 flex items-center justify-center text-[8px] font-black text-primary-400 uppercase">
                        +{Math.max(0, (eventCounts[event.id]?.total || 0) - 3)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 group/btn">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover/btn:text-primary-400 transition-colors">Configure</span>
                      <ArrowRight className="w-4 h-4 text-slate-700 group-hover/btn:text-primary-400 transform group-hover/btn:translate-x-1 transition-all" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : subpage === "categories" ? (
        /* --- CATEGORIES SUB-PAGE --- */
        (() => {
          const event = events.find(e => e.id === id);
          if (!event) return null;
          return (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-4">
                <button 
                  onClick={() => navigate(`/admin/events/${id}`)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold text-white">Categories Management</h2>
              </div>
              <CategoriesView 
                event={event} 
                availableCategories={availableCategories}
                onClose={() => navigate(`/admin/events/${id}`)}
              />
            </div>
          );
        })()
      ) : subpage === "template" ? (
        /* --- TEMPLATE SUB-PAGE --- */
        (() => {
          const event = events.find(e => e.id === id);
          if (!event) return null;
          return (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-4">
                <button 
                  onClick={() => navigate(`/admin/events/${id}`)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold text-white font-serif">Template Configuration</h2>
              </div>
              <TemplateView 
                event={event} 
                onClose={() => navigate(`/admin/events/${id}`)}
                onSave={loadEvents}
              />
            </div>
          );
        })()
      ) : subpage === "clubs" ? (
        /* --- CLUBS SUB-PAGE --- */
        (() => {
          const event = events.find(e => e.id === id);
          if (!event) return null;
          return (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-4">
                <button 
                  onClick={() => navigate(`/admin/events/${id}`)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold text-white font-serif">Event Clubs & Analytics</h2>
              </div>
              <ClubsAnalyticsView 
                event={event} 
                onClose={() => navigate(`/admin/events/${id}`)}
                onUpload={() => loadEvents()}
              />
            </div>
          );
        })()
      ) : (
        /* --- DETAIL VIEW (DEFAULT) --- */
        (() => {
          const event = events.find(e => e.id === id);
          if (!event) return (
            <div className="text-center py-20">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2 font-serif">Event Not Found</h2>
              <p className="text-slate-400 mb-6">The event you are looking for does not exist or has been deleted.</p>
              <Button onClick={() => navigate("/admin/events")}>Go Back to Events</Button>
            </div>
          );

          const counts = eventCounts[event.id] || { total: 0, pending: 0, approved: 0 };
          const link = getRegistrationLink(event.slug);

          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10"
            >
              {/* Event Operational Console */}
              <Card className="relative overflow-hidden group">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary-600 via-primary-400 to-cyan-500" />
                <CardContent className="p-10 space-y-10">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
                    <div className="space-y-6">
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-6">
                          <h2 className="text-4xl font-black text-white uppercase tracking-tight italic">{event.name}</h2>
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={async () => {
                                try {
                                  await EventsAPI.update(event.id, { registrationOpen: !event.registrationOpen });
                                  loadEvents();
                                  toast.success(`Registration ${!event.registrationOpen ? 'opened' : 'closed'}`);
                                } catch (err) {
                                  toast.error("Failed to toggle status");
                                }
                              }}
                              className={cn(
                                "flex items-center gap-3 px-6 py-2.5 rounded-2xl border transition-all duration-300 active:scale-95 shadow-2xl group/toggle",
                                event.registrationOpen 
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-emerald-500/10" 
                                  : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 shadow-amber-500/10"
                              )}
                            >
                              <div className={cn("w-2 h-2 rounded-full animate-pulse", event.registrationOpen ? 'bg-emerald-400' : 'bg-amber-400')} />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                {event.registrationOpen ? "LIVE OPS" : "REG PAUSED"}
                              </span>
                            </button>
                          </div>
                        </div>

                        {!event.registrationOpen && (
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-panel border-amber-500/20 bg-amber-500/[0.02] rounded-3xl p-8 max-w-2xl shadow-2xl backdrop-blur-3xl"
                          >
                            <div className="flex items-start gap-6">
                              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-500 border border-amber-500/20">
                                <AlertCircle className="w-6 h-6" />
                              </div>
                              <div className="flex-1 space-y-6">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                                      Public Intercept Message
                                    </label>
                                    <Edit className="w-3.5 h-3.5 text-slate-600" />
                                  </div>
                                  <textarea
                                    value={localClosedMessage}
                                    onChange={(e) => setLocalClosedMessage(e.target.value)}
                                    placeholder="e.g. System currently offline for maintenance..."
                                    className="w-full bg-transparent border-none p-0 text-lg text-white placeholder:text-slate-700 focus:ring-0 resize-none min-h-[80px] font-light leading-relaxed tracking-wide"
                                    rows={2}
                                  />
                                </div>
                                <div className="flex justify-end pt-2">
                                  <Button 
                                    variant="secondary" 
                                    icon={Check}
                                    loading={isSavingMessage}
                                    disabled={localClosedMessage === (event.registrationClosedMessage || "")}
                                    onClick={async () => {
                                      setIsSavingMessage(true);
                                      try {
                                        await EventsAPI.update(event.id, { registrationClosedMessage: localClosedMessage });
                                        await loadEvents();
                                        toast.success("Intercept message updated");
                                      } catch (err) {
                                        toast.error("Failed to push update");
                                      } finally {
                                        setIsSavingMessage(false);
                                      }
                                    }}
                                    className="px-6 py-2.5 text-[9px] font-black uppercase tracking-widest border-white/10"
                                  >
                                    Commit Changes
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                          <Calendar className="w-4 h-4 text-primary-400" />
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {formatDate(event.startDate)} → {formatDate(event.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                          <Trophy className="w-4 h-4 text-primary-400" />
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{event.location}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 h-fit">
                      <Button 
                        variant="secondary" 
                        icon={Edit} 
                        onClick={() => handleOpenModal(event)}
                        className="bg-white/5 border-white/10 hover:bg-white/10 transition-all text-[10px] uppercase font-black tracking-widest px-6 py-3"
                      >
                        Settings
                      </Button>
                      <Button 
                        variant="ghost" 
                        icon={Trash2} 
                        onClick={() => handleDelete(event)} 
                        className="text-red-500/50 hover:text-red-400 hover:bg-red-500/10 px-4 py-3"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {event.description && (
                    <div className="max-w-4xl py-6 border-y border-white/5">
                      <p className="text-xl text-slate-400 leading-relaxed font-light italic opacity-80">
                        "{event.description}"
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-4">
                    <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 block mb-4">Registration Gateway</label>
                        <div className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 group/link hover:border-primary-500/30 transition-all">
                          <LinkIcon className="w-5 h-5 text-primary-500" />
                          <code className="text-primary-400 flex-1 truncate font-mono text-xs">{link}</code>
                          <div className="flex items-center gap-1 border-l border-white/10 pl-4 ms-2">
                            <button
                              onClick={() => copyRegistrationLink(event.slug)}
                              className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                              title="Copy URL"
                            >
                              {copiedSlug === event.slug ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                            </button>
                            <a 
                              href={link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                            >
                              <ExternalLink className="w-5 h-5" />
                            </a>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-white/5 rounded-2xl border border-white/5">
                          <FileText className="w-4 h-4 text-primary-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Required:</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{getDocumentLabel(event.requiredDocuments)}</span>
                        </div>
                        {event.backTemplateUrl && (
                          <div className="flex items-center gap-3 px-4 py-2.5 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Card Template Active</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      <div className="bg-white/5 rounded-3xl p-6 border border-white/5 group/stat hover:border-primary-500/20 transition-all">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 group-hover:text-primary-400 transition-colors">Total</p>
                        <p className="text-4xl font-black text-white tracking-tighter">{counts.total}</p>
                      </div>
                      <div className="bg-white/5 rounded-3xl p-6 border border-white/5 group/stat hover:border-amber-500/20 transition-all">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 group-hover:text-amber-400 transition-colors">Pending</p>
                        <p className="text-4xl font-black text-amber-500 tracking-tighter">{counts.pending}</p>
                      </div>
                      <div className="bg-white/5 rounded-3xl p-6 border border-white/5 group/stat hover:border-emerald-500/20 transition-all">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 group-hover:text-emerald-400 transition-colors">Approved</p>
                        <p className="text-4xl font-black text-emerald-500 tracking-tighter">{counts.approved}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Sections */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DetailActionCard 
                  title="Categories" 
                  description="Manage roles, registration fees, and badge colors for this event"
                  icon={Tags}
                  color="from-primary-600 to-blue-500"
                  onClick={() => navigate(`/admin/events/${id}/categories`)}
                />
                <DetailActionCard 
                  title="Accreditation Template" 
                  description="Configure card headers, sponsor logos, and back-side access zones"
                  icon={FileImage}
                  color="from-emerald-600 to-teal-500"
                  onClick={() => navigate(`/admin/events/${id}/template`)}
                />
                <DetailActionCard 
                  title="Event Clubs List" 
                  description="Upload and manage the list of registered clubs for searchable selection"
                  icon={Upload}
                  color="from-purple-600 to-indigo-500"
                  onClick={() => navigate(`/admin/events/${id}/clubs`)}
                />
              </div>
            </motion.div>
          );
        })()
      )}

      {/* Create/Edit Event Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingEvent ? "Edit Event" : "Create Event"}
        size="lg"
      >
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <Input
            label="Event Name"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="International Swimming Championship 2025"
            required
          />

          <Input
            label="URL Slug"
            value={formData.slug}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, slug: e.target.value }))
            }
            placeholder="swimming-2025"
            required
          />

          <div>
            <label className="block text-lg font-medium text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-lg"
              placeholder="Describe your event..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, startDate: e.target.value }))
              }
              required
            />
            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, endDate: e.target.value }))
              }
              required
            />
          </div>

          <Input
            label="Location"
            value={formData.location}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, location: e.target.value }))
            }
            placeholder="Dubai Sports Complex"
          />

          <Input
            label="Age Calculation Year"
            type="number"
            value={formData.ageCalculationYear}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                ageCalculationYear: parseInt(e.target.value)
              }))
            }
          />

          <div>
            <label className="block text-lg font-medium text-slate-300 mb-1.5">
              Reporting Times
            </label>
            <textarea
              value={formData.reportingTimes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reportingTimes: e.target.value }))
              }
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-lg"
              placeholder="Athletes: 1 hour before event. Officials: 2 hours before session."
            />
          </div>

          {/* Required Documents Selection */}
          <div>
            <label className="block text-lg font-medium text-slate-300 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-400" />
                Required Documents for Registration
              </div>
            </label>
            <p className="text-lg text-slate-500 mb-3">
              Select which documents participants must upload during registration
            </p>
            <div className="grid grid-cols-2 gap-3">
              {DOCUMENT_OPTIONS.map((doc) => {
                const isSelected = (formData.requiredDocuments || []).includes(doc.id);
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => toggleDocumentRequired(doc.id)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? "border-primary-500 bg-primary-500/20"
                        : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? "border-primary-500 bg-primary-500" : "border-slate-500"
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-lg font-medium ${isSelected ? "text-white" : "text-slate-300"}`}>
                        {doc.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {(!formData.requiredDocuments || formData.requiredDocuments.length === 0) && (
              <p className="text-lg text-amber-400 mt-2">Please select at least one required document</p>
            )}
          </div>


          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseModal}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingEvent ? "Update Event" : "Create Event"}
            </Button>
          </div>
        </form>
      </Modal>



      {/* Delete Event Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => !deleting && setDeleteModal({ open: false, event: null })}
        title="Delete Event"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-lg font-semibold text-red-400">Permanently delete this event?</p>
              <p className="text-lg text-slate-300 font-extralight mt-1">
                Event <span className="font-bold text-white">{deleteModal.event?.name}</span> and ALL related data (accreditations, zones, categories) will be permanently removed. This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteModal({ open: false, event: null })}
              className="flex-1"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              className="flex-1"
              loading={deleting}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Event"}
            </Button>
          </div>
        </div>
      </Modal>



      {/* Share Link Modal */}
      <Modal
        isOpen={shareModal.open}
        onClose={() => setShareModal({ open: false, slug: "" })}
        title="Copy Registration Link"
      >
        <div className="p-6 space-y-4">
          <p className="text-lg text-slate-400 font-extralight">
            Copy this link to share the registration form:
          </p>
          <div className="flex gap-2">
            <input
              id="share-link-input"
              type="text"
              readOnly
              value={getRegistrationLink(shareModal.slug)}
              className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-lg focus:outline-none"
            />
            <Button onClick={handleManualCopy} icon={Copy}>
              Copy
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// --- SUB-COMPONENTS ---
function DetailActionCard({ title, description, icon: Icon, color, onClick }) {
  return (
    <motion.button 
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative group w-full text-left"
    >
      {/* Premium Glassmorphic Container */}
      <div className="relative overflow-hidden rounded-3xl p-8 h-full bg-slate-900/40 backdrop-blur-xl border border-white/5 group-hover:border-white/20 transition-all duration-500 shadow-2xl">
        
        {/* Dynamic Background Glow Effect */}
        <div className={`absolute -inset-24 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 blur-[80px] transition-opacity duration-700 pointer-events-none`} />
        
        {/* Internal Glow on Hover */}
        <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl ${color} opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-500`} />

        {/* Action Icon with Internal Depth */}
        <div className="relative mb-8">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg shadow-black/40 group-hover:shadow-${color.split('-')[1]}-500/20 transition-all duration-500 overflow-hidden`}>
            {/* Subtle internal glow for the icon */}
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Icon className="w-8 h-8 relative z-10" />
          </div>
          
          {/* Animated rings around icon on hover */}
          <div className={`absolute -inset-2 border-2 border-white/5 rounded-3xl opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 pointer-events-none`} />
        </div>
        
        {/* Content Hierarchy */}
        <div className="relative z-10 space-y-3">
          <h3 className="text-2xl font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/60 transition-all duration-300 uppercase tracking-tighter leading-none">
            {title}
          </h3>
          <p className="text-slate-400 text-sm font-light leading-relaxed group-hover:text-slate-300 transition-colors duration-300 max-w-[90%]">
            {description}
          </p>
        </div>

        {/* Enhanced Call-to-Action Indicator */}
        <div className="mt-10 flex items-center gap-3">
          <div className="h-[2px] w-12 bg-white/5 group-hover:w-16 group-hover:bg-gradient-to-r group-hover:from-primary-500 group-hover:to-transparent transition-all duration-700" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-primary-400 transition-colors duration-500">
            Configure Module
          </span>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-primary-400 group-hover:translate-x-2 transition-all duration-500" />
        </div>
      </div>

      {/* Outer Border Glow Support */}
      <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 blur-xl transition-opacity duration-700 -z-10`} />
    </motion.button>
  );
}

// --- SUB-PAGE VIEWS ---

function CategoriesView({ event, availableCategories, onClose }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [cats, setCats] = useState(availableCategories);
  const toast = useToast();

  useEffect(() => {
    loadSelected();
  }, [event.id]);

  useEffect(() => {
    setCats(availableCategories);
  }, [availableCategories]);

  const loadSelected = async () => {
    try {
      const data = await EventCategoriesAPI.getByEventId(event.id);
      setSelectedCategories(data.map(r => r.categoryId));
    } catch (err) {
      console.error("Failed to load event categories", err);
    }
  };

  const toggleCategory = (id) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const updateCategoryColor = async (id, newColor) => {
    try {
      await CategoriesAPI.update(id, { badgeColor: newColor });
      setCats(prev => prev.map(c => c.id === id ? { ...c, badgeColor: newColor } : c));
      toast.success("Category color updated");
    } catch (err) {
      toast.error("Failed to update color");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await EventCategoriesAPI.setForEvent(event.id, selectedCategories);
      toast.success("Categories updated successfully");
      onClose();
    } catch (err) {
      toast.error("Failed to save categories");
    } finally {
      setSaving(false);
    }
  };

  // Group categories: Parents (parentId null) and their children
  const mainCategories = cats.filter(c => !c.parentId);
  const subCategories = cats.filter(c => !!c.parentId);

  const groupedCategories = mainCategories.map(parent => ({
    ...parent,
    children: subCategories.filter(child => child.parentId === parent.id)
  }));

  // Categories without a valid parent (shouldn't happen with current data but for safety)
  const orphanCategories = subCategories.filter(child => !mainCategories.some(p => p.id === child.parentId));

  return (
    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-xl">
      <CardContent className="p-8 space-y-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase italic">Participant Categories</h3>
            <p className="text-slate-400 font-light">Select which roles and groups can register for this event.</p>
          </div>
          <Button onClick={save} loading={saving}>Save Changes</Button>
        </div>

        <div className="space-y-6">
          {groupedCategories.map(parent => (
            <div key={parent.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/5" />
                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] bg-slate-900/40 px-3 py-0.5 rounded-full border border-white/5">
                  {parent.name}
                </h4>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {parent.children.map(cat => (
                  <div
                    key={cat.id}
                    className={`relative p-2.5 rounded-lg border transition-all duration-300 flex flex-col gap-2 group ${
                      selectedCategories.includes(cat.id)
                        ? "border-primary-500 bg-primary-500/5 shadow-lg shadow-primary-500/5"
                        : "border-slate-800 bg-slate-950/30 hover:border-slate-700"
                    }`}
                  >
                    <div 
                      className="cursor-pointer flex-1"
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div 
                          className="w-3 h-3 rounded-full shadow border border-white/10 flex-shrink-0" 
                          style={{ backgroundColor: cat.badgeColor }} 
                        />
                        <span className={`font-bold uppercase tracking-tight text-[10px] truncate ${selectedCategories.includes(cat.id) ? "text-white" : "text-slate-400 group-hover:text-slate-300"}`}>
                          {cat.name}
                        </span>
                        {selectedCategories.includes(cat.id) && <Check className="w-3 h-3 text-primary-400 ml-auto flex-shrink-0" />}
                      </div>
                      {cat.description && (
                        <p className="text-[9px] text-slate-600 font-light leading-tight line-clamp-1 group-hover:text-slate-500">
                          {cat.description}
                        </p>
                      )}
                    </div>

                    {/* Color Picker Section */}
                    <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {COLOR_PRESETS.slice(0, 4).map(color => (
                          <button
                            key={color}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCategoryColor(cat.id, color);
                            }}
                            className={`w-2.5 h-2.5 rounded-sm transition-all hover:scale-125 shadow-sm ${cat.badgeColor === color ? 'ring-1 ring-white ring-offset-1 ring-offset-slate-900 scale-110' : 'opacity-30 hover:opacity-100'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      
                      <div className="relative group/picker">
                        <button 
                          className="p-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.1)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById(`color-picker-${cat.id}`).click();
                          }}
                          title="Change Color"
                        >
                          <Edit className="w-2.5 h-2.5" />
                        </button>
                        <input
                          id={`color-picker-${cat.id}`}
                          type="color"
                          value={cat.badgeColor}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateCategoryColor(cat.id, e.target.value);
                          }}
                          className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {orphanCategories.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/5" />
                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] bg-slate-900/40 px-3 py-0.5 rounded-full border border-white/5">
                  Others
                </h4>
                <div className="h-px flex-1 bg-white/5" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {orphanCategories.map(cat => (
                  <div
                    key={cat.id}
                    className={`relative p-2.5 rounded-lg border transition-all duration-300 flex flex-col gap-2 group ${
                      selectedCategories.includes(cat.id)
                        ? "border-primary-500 bg-primary-500/5 shadow-lg shadow-primary-500/5"
                        : "border-slate-800 bg-slate-950/30 hover:border-slate-700"
                    }`}
                  >
                    <div 
                      className="cursor-pointer flex-1"
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div 
                          className="w-3 h-3 rounded-full shadow border border-white/10 flex-shrink-0" 
                          style={{ backgroundColor: cat.badgeColor }} 
                        />
                        <span className={`font-bold uppercase tracking-tight text-[10px] truncate ${selectedCategories.includes(cat.id) ? "text-white" : "text-slate-400 group-hover:text-slate-300"}`}>
                          {cat.name}
                        </span>
                        {selectedCategories.includes(cat.id) && <Check className="w-3 h-3 text-primary-400 ml-auto flex-shrink-0" />}
                      </div>
                      {cat.description && (
                        <p className="text-[9px] text-slate-600 font-light leading-tight line-clamp-1 group-hover:text-slate-500">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {COLOR_PRESETS.slice(0, 4).map(color => (
                          <button
                            key={color}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCategoryColor(cat.id, color);
                            }}
                            className={`w-2.5 h-2.5 rounded-sm transition-all hover:scale-125 shadow-sm ${cat.badgeColor === color ? 'ring-1 ring-white ring-offset-1 ring-offset-slate-900 scale-110' : 'opacity-30 hover:opacity-100'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      
                      <div className="relative group/picker">
                        <button 
                          className="p-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.1)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById(`orphan-picker-${cat.id}`).click();
                          }}
                          title="Change Color"
                        >
                          <Edit className="w-2.5 h-2.5" />
                        </button>
                        <input
                          id={`orphan-picker-${cat.id}`}
                          type="color"
                          value={cat.badgeColor}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateCategoryColor(cat.id, e.target.value);
                          }}
                          className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateView({ event, onClose, onSave }) {
  const [templateData, setTemplateData] = useState({
    headerArabic: event.headerArabic || "",
    headerSubtitle: event.headerSubtitle || "",
    logoUrl: event.logoUrl || "",
    backTemplateUrl: event.backTemplateUrl || "",
    sponsorLogos: event.sponsorLogos || []
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleFileUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setTemplateData(prev => ({ ...prev, [field]: base64 }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await EventsAPI.update(event.id, templateData);
      toast.success("Template settings saved");
      if (onSave) onSave();
      onClose();
    } catch (err) {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-white/5 bg-slate-950/20 backdrop-blur-3xl overflow-hidden group">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-600 via-emerald-400 to-transparent opacity-50" />
      <CardContent className="p-10 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic font-serif">
              Visual <span className="text-emerald-500">Architecture</span>
            </h3>
            <p className="text-slate-500 font-light text-lg">Configure event identity, sponsor prominence, and card templates.</p>
          </div>
          <Button 
            onClick={save} 
            loading={saving}
            className="px-10 py-4 text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30"
          >
            Commit Template
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Front Configuration */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-black text-white uppercase tracking-tight font-serif">Front Identity</h4>
            </div>
            
            <div className="space-y-8 bg-white/[0.02] p-8 rounded-3xl border border-white/5 shadow-2xl">
              <div className="grid grid-cols-1 gap-6">
                <Input 
                  label="Display Header (Arabic)"
                  value={templateData.headerArabic}
                  onChange={e => setTemplateData(prev => ({ ...prev, headerArabic: e.target.value }))}
                  placeholder="e.g., دبي للألعاب المائية"
                  className="bg-slate-950/50 border-white/10"
                />
                <Input 
                  label="Operational Subtitle"
                  value={templateData.headerSubtitle}
                  onChange={e => setTemplateData(prev => ({ ...prev, headerSubtitle: e.target.value }))}
                  placeholder="e.g., Hamdan Sports Complex"
                  className="bg-slate-950/50 border-white/10"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block">Primary Event Mark</label>
                <div className="flex items-center gap-8">
                  {templateData.logoUrl ? (
                    <div className="relative group/logo">
                      <div className="absolute inset-0 bg-primary-500/20 blur-2xl opacity-0 group-hover/logo:opacity-100 transition-opacity" />
                      <img src={templateData.logoUrl} className="relative w-32 h-32 object-contain rounded-2xl bg-white/[0.03] p-4 border border-white/10" alt="Logo" />
                      <button 
                        onClick={() => setTemplateData(prev => ({ ...prev, logoUrl: "" }))}
                        className="absolute -top-3 -right-3 p-2 bg-red-500 rounded-full text-white shadow-xl hover:scale-110 active:scale-95 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-32 h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-all group/up text-slate-600">
                      <Upload className="w-8 h-8 mb-2 group-hover/up:text-emerald-500 transition-colors" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Upload Mark</span>
                      <input type="file" accept="image/*" onChange={e => handleFileUpload(e, "logoUrl")} className="hidden" />
                    </label>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400">Mark Assets</p>
                    <p className="text-[10px] text-slate-600 leading-relaxed max-w-[200px]">Opt for high-resolution PNG or SVG formats with transparency. Max file size: 2MB.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Back Configuration */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20">
                <FileImage className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-black text-white uppercase tracking-tight">Security & Sponsors</h4>
            </div>

            <div className="space-y-10 bg-white/[0.02] p-8 rounded-3xl border border-white/5 shadow-2xl">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-4">Back-Side Template</label>
                <div className="relative aspect-[16/9] max-w-[280px] border-2 border-dashed border-white/10 rounded-2xl overflow-hidden group/back">
                  {templateData.backTemplateUrl ? (
                    <>
                      <img src={templateData.backTemplateUrl} className="w-full h-full object-cover" alt="Back Template" />
                      <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover/back:opacity-100 flex flex-col items-center justify-center transition-opacity gap-3">
                        <Button 
                          variant="ghost" 
                          icon={Trash2} 
                          onClick={() => setTemplateData(prev => ({ ...prev, backTemplateUrl: "" }))}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          Clear Asset
                        </Button>
                      </div>
                    </>
                  ) : (
                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-500/[0.02] transition-colors group/up2">
                      <Upload className="w-10 h-10 text-slate-700 group-hover/up2:text-emerald-500 transition-colors mb-3" />
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Architect Back View</span>
                      <input type="file" accept="image/*" onChange={e => handleFileUpload(e, "backTemplateUrl")} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block">Sponsor Matrix (Max 6)</label>
                <div className="grid grid-cols-3 gap-4">
                  {templateData.sponsorLogos.map((logo, i) => (
                    <div key={i} className="relative group/spon aspect-[1.5] bg-white/[0.03] rounded-xl flex items-center justify-center p-3 border border-white/10 shadow-lg">
                      <img src={logo} className="max-w-full max-h-full object-contain grayscale opacity-60 group-hover/spon:grayscale-0 group-hover/spon:opacity-100 transition-all duration-500" alt="Sponsor" />
                      <button 
                         onClick={() => setTemplateData(prev => ({ ...prev, sponsorLogos: prev.sponsorLogos.filter((_, idx) => idx !== i) }))}
                         className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full text-white opacity-0 group-hover/spon:opacity-100 transition-all shadow-xl hover:scale-110"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {templateData.sponsorLogos.length < 6 && (
                    <label className="aspect-[1.5] border-2 border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-all text-slate-700 group/add">
                      <Plus className="w-6 h-6 group-hover/add:text-emerald-500 transition-colors" />
                      <input type="file" accept="image/*" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const base64 = await fileToBase64(file);
                          setTemplateData(prev => ({ ...prev, sponsorLogos: [...prev.sponsorLogos, base64] }));
                        }
                      }} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClubsAnalyticsView({ event }) {
  const [clubs, setClubs] = useState([]);
  const [accreditations, setAccreditations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, [event.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clubsData, accs] = await Promise.all([
        GlobalSettingsAPI.getClubs(event.id),
        AccreditationsAPI.getByEventId(event.id)
      ]);
      
      setClubs(clubsData);
      // Fetch v2 metadata manually if we need the filename
      const v2Raw = await GlobalSettingsAPI.get(`event_${event.id}_clubs_v2`);
      if (v2Raw) {
        const parsed = JSON.parse(v2Raw);
        if (parsed.metadata) setUploadedFile(parsed.metadata);
      }
      
      setAccreditations(accs || []);
    } catch (err) {
      console.error("Failed to load clubs analytics", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setParsing(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        let clubNames = [];
        
        if (file.name.endsWith('.pdf')) {
          const text = await parsePDFText(file);
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          
          let headIdx = -1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes('registered') && lines[i].toLowerCase().includes('club')) {
              headIdx = i;
              break;
            }
          }

          const dataLines = headIdx !== -1 ? lines.slice(headIdx + 1) : lines;
          
          clubNames = dataLines.map(line => {
            const parts = line.split(/\s+/);
            if (parts.length < 3) return null;
            
            // Typical line: 01 ABA-ZZ Aba Aquatics 24 ...
            // Or: ABA-ZZ Aba Aquatics 24
            const firstPartIsNumber = /^\d+$/.test(parts[0]);
            const startIdx = firstPartIsNumber ? 1 : 0;
            const code = parts[startIdx];
            
            // Find where the numbers start after the name
            let countStr = "0";
            let nameEndIdx = parts.length - 1;
            for (let i = startIdx + 2; i < parts.length; i++) {
              if (/^\d+$/.test(parts[i])) {
                countStr = parts[i];
                nameEndIdx = i;
                break;
              }
            }
            
            const fullName = parts.slice(startIdx + 1, nameEndIdx).join(" ");
            if (!fullName || fullName.length < 2) return null;

            return {
              short: code,
              full: toProperCase(fullName),
              fileRegistered: parseInt(countStr) || 0
            };
          }).filter(Boolean);
        } else {
          // Excel or CSV
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

          // SS logic: Column P (15) is Short, Q (16) is Full, S (18) is Reg
          // But we'll be flexible and check R (17) and T (19) if S is 0
          clubNames = data.slice(0)
            .map(row => {
              const full = toProperCase(String(row[16] || row[0] || "").trim());
              if (!full || full.length < 2) return null;
              
              const valS = parseInt(row[18]) || 0;
              const valR = parseInt(row[17]) || 0;
              const valT = parseInt(row[19]) || 0;
              
              return {
                short: String(row[15] || row[0] || "").trim(),
                full: full,
                fileRegistered: valS || valR || valT || 0
              };
            })
            .filter(Boolean);
        }

        // Unique clubs by Full Name
        const uniqueClubs = [];
        const seen = new Set();
        for (const club of clubNames) {
          if (!seen.has(club.full.toLowerCase())) {
            seen.add(club.full.toLowerCase());
            uniqueClubs.push(club);
          }
        }
        uniqueClubs.sort((a, b) => a.full.localeCompare(b.full));
        
        if (uniqueClubs.length > 0) {
          const metadata = { name: file.name, timestamp: new Date().toISOString() };
          await GlobalSettingsAPI.setClubs(event.id, uniqueClubs, metadata);
          setClubs(uniqueClubs);
          setUploadedFile(metadata);
          toast.success(`Successfully imported ${uniqueClubs.length} clubs`);
        } else {
          toast.error("No clubs found in file");
        }
      } catch (err) {
        console.error("Parsing failed", err);
        toast.error("Failed to parse file");
      } finally {
        setParsing(false);
      }
    };

    if (file.name.endsWith('.pdf')) {
      reader.onload(); // trigger immediate for PDF as we use parsePDFText
    } else {
      reader.readAsBinaryString(file);
    }
    e.target.value = '';
  };

  const clearClubs = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmClearClubs = async () => {
    try {
      await GlobalSettingsAPI.setClubs(event.id, []);
      setClubs([]);
      setUploadedFile(null);
      setShowDeleteConfirm(false);
      toast.success("Clubs list cleared");
    } catch {
      toast.error("Failed to clear list");
    }
  };

  const analytics = useMemo(() => {
    if (!Array.isArray(clubs) || !Array.isArray(accreditations)) return [];

    const rawAnalytics = clubs.map((club, index) => {
      const clubFull = club?.full || (typeof club === 'string' ? club : "");
      const clubShort = club?.short || clubFull || "N/A";
      const clubNameStr = String(clubFull).trim();
      const clubTerm = clubNameStr.toLowerCase();
      const fileRegistered = club?.fileRegistered || 0;

      // Filter for all registrations for this club
      const clubAccs = accreditations.filter(a => {
        const c = String(a.club || "").trim().toLowerCase();
        return c === clubTerm;
      });
      
      // Registered Athletes (only roles containing "Athlete")
      const registeredAthletes = clubAccs.filter(a => String(a.role || "").toLowerCase().includes("athlete"));
      
      // Approved Athlete Accreditations
      const approvedAthletes = registeredAthletes.filter(a => a.status === "approved");
      
      return {
        sr: index + 1,
        short: clubShort,
        full: clubNameStr || "Unknown Club",
        registered: registeredAthletes.length,
        fileRegistered: fileRegistered,
        approved: approvedAthletes.length,
        approvedNames: approvedAthletes.map(a => `${a.firstName || ""} ${a.lastName || ""}`.trim()).join(", ")
      };
    }).filter(r => r.full !== "Unknown Club");

    if (!searchTerm.trim()) return rawAnalytics;
    
    const term = searchTerm.toLowerCase();
    return rawAnalytics.filter(r => 
      String(r.full).toLowerCase().includes(term) || 
      String(r.short).toLowerCase().includes(term)
    );
  }, [clubs, accreditations, searchTerm]);

  const handleExport = () => {
    if (analytics.length === 0) return;
    const exportData = analytics.map(r => ({
      "SR#": r.sr,
      "Club Short Name": r.short,
      "Club Full Name": r.full,
      "Registered (File)": r.fileRegistered,
      "Registered (Live)": r.registered,
      "Accreditations Issued": r.approved,
      "Issued Athletes List": r.approvedNames
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Club Analytics");
    XLSX.writeFile(wb, `${event.name.replace(/\s+/g, '_')}_Club_Analytics.xlsx`);
    toast.success("Exported successfully");
  };

  return (
    <div className="space-y-8">
      <Card className="border-white/5 bg-slate-950/20 backdrop-blur-3xl overflow-hidden group">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary-600 via-primary-400 to-transparent opacity-50" />
        <CardContent className="p-0">
          <div className="p-10 border-b border-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            <div className="space-y-2">
              <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic font-serif">
                Strategic <span className="text-primary-500">Clubs Matrix</span>
              </h3>
              <p className="text-slate-500 font-light text-lg">Cross-referencing registered lists with active field deployments.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {uploadedFile && (
                <div className="flex items-center gap-4 px-5 py-2.5 bg-white/[0.03] border border-white/10 rounded-2xl shadow-xl">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Active Manifest</span>
                    <span className="text-xs text-white font-mono truncate max-w-[180px]">{uploadedFile.name}</span>
                  </div>
                  <div className="h-8 w-px bg-white/10 mx-1" />
                  <div className="flex gap-2">
                    <button onClick={() => document.getElementById('club-import').click()} className="p-2 text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 rounded-xl transition-all" title="Synchronize New File">
                      <Upload className="w-4 h-4" />
                    </button>
                    <button onClick={clearClubs} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all" title="Purge Manifest">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              <div className="relative group/search">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/search:text-primary-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Filter by club name..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-6 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-white text-lg placeholder:text-slate-700 focus:outline-none focus:border-primary-500/50 transition-all min-w-[280px] font-light"
                />
              </div>
              <Button 
                variant="secondary" 
                icon={Download} 
                onClick={handleExport} 
                disabled={analytics.length === 0}
                className="bg-white/5 border-white/10 text-[10px] uppercase font-black tracking-widest px-6 py-3.5"
              >
                Export Matrix
              </Button>
              {!uploadedFile && (
                <Button 
                  icon={parsing ? undefined : Upload} 
                  loading={parsing} 
                  onClick={() => document.getElementById('club-import').click()}
                  className="px-8 py-3.5 text-[10px] uppercase font-black tracking-widest shadow-2xl shadow-primary-500/20"
                >
                  Import Master List
                </Button>
              )}
              <input id="club-import" type="file" className="hidden" accept=".csv,.xlsx,.pdf" onChange={handleFileUpload} />
            </div>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Security Action: Purge List">
              <div className="p-8 space-y-8">
                <div className="flex items-center gap-6 p-6 bg-red-500/5 border border-red-500/20 rounded-3xl">
                  <AlertCircle className="w-10 h-10 text-red-500 flex-shrink-0" />
                  <p className="text-slate-300 text-lg font-light leading-relaxed">
                    You are about to purge the active master list. This will clear all synchronized analytics. <span className="text-white font-bold">This action is irreversible.</span>
                  </p>
                </div>
                <div className="flex justify-end gap-4">
                  <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} className="px-8 border-white/10 uppercase text-[10px] font-black">Cancel</Button>
                  <Button 
                    variant="danger" 
                    icon={Trash2}
                    onClick={confirmClearClubs}
                    className="px-8 uppercase text-[10px] font-black bg-red-600 hover:bg-red-500 shadow-2xl shadow-red-500/20"
                  >
                    Confirm Purge
                  </Button>
                </div>
              </div>
            </Modal>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.01] border-b border-white/5">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Idx</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Short Code</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Club Entity Name</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 text-center">Registrations</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 text-center">Accredited</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 text-center">Operational Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {analytics.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-32 text-center">
                      <div className="flex flex-col items-center gap-6 opacity-20">
                        <Users className="w-20 h-20 text-slate-500" />
                        <div className="space-y-1">
                          <p className="text-2xl font-black text-slate-500 uppercase tracking-tighter">No Active Matrix</p>
                          <p className="text-lg font-light text-slate-600 italic">Synchronize a master club list to begin analysis.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  analytics.map((row) => (
                    <tr key={row.sr} className="group/row hover:bg-white/[0.03] transition-all duration-300">
                      <td className="px-8 py-6 text-slate-700 font-mono text-xs">{String(row.sr).padStart(3, '0')}</td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-500 group-hover/row:text-primary-400 transition-colors uppercase tracking-[0.2em] text-[10px]">
                          {row.short}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-bold text-white group-hover/row:text-primary-400 transition-colors tracking-tight text-lg">
                          {row.full}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.03] text-white text-[10px] font-black border border-white/10 uppercase tracking-widest">
                            {row.fileRegistered} <span className="text-slate-600">Master</span>
                          </span>
                          {row.registered > 0 && (
                            <span className="text-[10px] text-primary-500 font-black uppercase tracking-widest italic animate-pulse">
                              Live: {row.registered}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-black tracking-[0.15em] uppercase border transition-all duration-300",
                          row.approved > 0 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/10" 
                            : "bg-white/[0.01] text-slate-700 border-white/5"
                        )}>
                          {row.approved} Synchronized
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-3 text-slate-800">
                          <Activity className="w-4 h-4" />
                          <span className="text-[9px] font-black uppercase tracking-[0.3em]">Pending Uplink</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Aggregate Stats Bar */}
      {analytics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Total Clubs" value={analytics.length} icon={Users} color="from-blue-500 to-cyan-500" />
          <StatCard 
            label="Total Registered Athletes" 
            value={analytics.reduce((sum, r) => sum + r.fileRegistered, 0)} 
            icon={Trophy} 
            color="from-primary-500 to-purple-500" 
          />
          <StatCard 
            label="Total Accreditations Issued" 
            value={analytics.reduce((sum, r) => sum + r.approved, 0)} 
            icon={CheckCircle2} 
            color="from-emerald-500 to-teal-500" 
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <Card className="border-slate-800 bg-slate-900/40 overflow-hidden relative group">
      <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${color}`} />
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1 font-serif">{label}</p>
            <p className="text-3xl font-black text-white tracking-tighter font-serif">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
