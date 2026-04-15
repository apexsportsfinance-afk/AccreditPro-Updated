import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  Filter, 
  Search, 
  Star, 
  TrendingUp, 
  Users, 
  QrCode, 
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Download,
  Calendar,
  Settings,
  Copy,
  Info
} from "lucide-react";
import { FeedbackAPI, EventsAPI } from "../../lib/storage";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import StatsCard from "../../components/ui/StatsCard";
import DataTable from "../../components/ui/DataTable";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

const roles = ["Parent", "Athlete", "Coach", "Team Manager"];

export default function Feedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [events, setEvents] = useState([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [showSetup, setShowSetup] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const { canAccessEvent } = useAuth();

  useEffect(() => {
    async function init() {
      try {
        const evs = await EventsAPI.getAll();
        const filtered = evs.filter(e => canAccessEvent(e.id));
        setEvents(filtered);
        if (filtered.length > 0) setSelectedEventId(filtered[0].id);
      } catch (err) {
        toast.error("Failed to load events");
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!selectedEventId) return;
      setLoading(true);
      try {
        const [all, st] = await Promise.all([
          FeedbackAPI.getAll(selectedEventId),
          FeedbackAPI.getStats(selectedEventId)
        ]);
        setFeedbacks(all);
        setStats(st);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load feedback data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedEventId]);

  const filteredFeedbacks = feedbacks.filter(f => 
    roleFilter === "All" || f.role === roleFilter
  );

  const getRoleBadge = (role) => {
    const variants = {
      "Parent": "info",
      "Athlete": "success",
      "Coach": "warning",
      "Team Manager": "danger"
    };
    return <Badge variant={variants[role] || "default"}>{role}</Badge>;
  };

  const columns = [
    {
      key: "createdAt",
      header: "Submitted",
      render: (v) => <span className="text-slate-400 text-sm">{new Date(v).toLocaleDateString()}</span>
    },
    {
      key: "role",
      header: "Category",
      render: (v) => getRoleBadge(v)
    },
    {
      key: "overallRating",
      header: "Overall Experience",
      render: (v) => (
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`w-3.5 h-3.5 ${i < v ? "fill-yellow-400 text-yellow-400" : "text-slate-700"}`} />
          ))}
        </div>
      )
    },
    {
      key: "npsScore",
      header: "NPS",
      render: (v) => (
        <span className={`font-bold ${v >= 9 ? "text-success-400" : v >= 7 ? "text-warning-400" : "text-red-400"}`}>
          {v}/10
        </span>
      )
    },
    {
      key: "qrUsed",
      header: "QR Used",
      render: (v) => v ? <Badge variant="success">Yes</Badge> : <Badge variant="default">No</Badge>
    },
    {
      key: "likedMost",
      header: "Feedback",
      render: (v, row) => (
        <div className="max-w-xs">
          <p className="text-sm text-white truncate font-medium">{v || "No comment"}</p>
          <p className="text-xs text-slate-500 truncate italic">{row.improveFuture}</p>
        </div>
      )
    },
    {
      key: "actions",
      header: "",
      render: (_, row) => (
        <Button variant="ghost" size="sm" icon={ExternalLink} onClick={() => setSelectedFeedback(row)}>
          View Detail
        </Button>
      )
    }
  ];

  return (
    <div id="admin_feedback_page" className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-base-alt backdrop-blur-md p-6 rounded-3xl border border-border shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-500/10 border border-primary-500/20 rounded-2xl flex items-center justify-center shadow-cyanGlowSmall">
            <MessageSquare className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-main tracking-tight">Event Feedback</h1>
            <p className="text-muted text-sm">Analyze participant satisfaction for DIAC 2026</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-base border-border rounded-xl px-4 py-2 text-main focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all min-w-[200px]"
          >
            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <Button 
            variant="outline" 
            icon={Settings} 
            onClick={() => setShowSetup(true)}
            className="border-primary-500/30 text-primary-400 hover:bg-primary-500/10"
          >
            Setup
          </Button>
          <Button variant="outline" icon={Download}>Export CSV</Button>
        </div>
      </div>

      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            title="Net Promoter Score" 
            value={`${stats.nps.toFixed(1)}/10`} 
            icon={TrendingUp} 
            trend="+0.5 from last event"
            variant="primary" 
          />
          <StatsCard 
            title="Overall Experience" 
            value={`${stats.avgOverall.toFixed(1)} / 5.0`} 
            icon={Star} 
            variant="warning" 
          />
          <StatsCard 
            title="Total Responses" 
            value={stats.total} 
            icon={Users} 
            variant="info" 
          />
          <StatsCard 
            title="QR Usage Rate" 
            value={`${Math.round((feedbacks.filter(f => f.qrUsed).length / feedbacks.length) * 100)}%`} 
            icon={QrCode} 
            variant="success" 
          />
        </div>
      ) : (
        <div className="bg-base-alt backdrop-blur-md p-8 rounded-3xl border border-dashed border-border flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-base rounded-2xl flex items-center justify-center text-muted mb-2">
            <Info className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-main">No Feedback Yet</h3>
            <p className="text-muted max-w-md mx-auto">
              Your feedback system is ready! Once you share the link and receive responses, 
              you'll see metrics like NPS and average experience here.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="primary" icon={Settings} onClick={() => setShowSetup(true)}>
