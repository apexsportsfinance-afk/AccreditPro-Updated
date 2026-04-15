import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Users,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  ArrowRight,
  Activity
} from "lucide-react";
import { formatDate, getStatusColor, getRoleColor, cn } from "../../lib/utils";
import Skeleton, { CardSkeleton } from "../../components/ui/Skeleton";
import StatsCard from "../../components/ui/StatsCard";
import Card, { CardHeader, CardContent } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { EventsAPI, AccreditationsAPI, AuditAPI } from "../../lib/storage";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalAccreditations: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [recentAccreditations, setRecentAccreditations] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventCounts, setEventCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allEvents, accStats, recentAcc, activityLogs] = await Promise.all([
        EventsAPI.getAll(),
        AccreditationsAPI.getStats(),
        AccreditationsAPI.getRecent(5),
        AuditAPI.getRecent(10)
      ]);

      setEvents(allEvents);
      setStats({
        totalEvents: allEvents.length,
        totalAccreditations: accStats.total,
        pending: accStats.pending,
        approved: accStats.approved,
        rejected: accStats.rejected
      });
      setRecentAccreditations(recentAcc);
      setRecentActivity(activityLogs);

      if (allEvents.length > 0) {
        const eventIds = allEvents.map(e => e.id);
        AccreditationsAPI.getCountsByEventIds(eventIds)
          .then(counts => setEventCounts(counts))
          .catch(err => console.error("Failed to load event counts:", err));
      }
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action) => {
    switch (action) {
      case "accreditation_approved":
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "accreditation_rejected":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "accreditation_submitted":
        return <Clock className="w-4 h-4 text-amber-400" />;
      default:
        return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div id="dashboard_page" className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight uppercase italic font-serif">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-[0.2em]">
            System Intelligence • Real-time Overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Server Status</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-3xl p-6 space-y-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-8 w-1/2" />
            </div>
          ))
        ) : (
          <>
            <StatsCard
              title="Total Events"
              value={stats.totalEvents}
              icon={Calendar}
              iconColor="text-blue-400"
              chart={[30, 40, 35, 50, 45, 60, 55]}
            />
            <StatsCard
              title="Total Accreditations"
              value={stats.totalAccreditations}
              icon={Users}
              iconColor="text-purple-400"
              chart={[20, 35, 45, 40, 55, 65, 75]}
            />
            <StatsCard
              title="Pending Review"
              value={stats.pending}
              icon={Clock}
              iconColor="text-amber-400"
              change={stats.pending > 0 ? "Action Required" : undefined}
              changeType={stats.pending > 0 ? "negative" : "neutral"}
              chart={[80, 70, 75, 60, 50, 55, 40]}
            />
            <StatsCard
              title="Approved"
              value={stats.approved}
              icon={CheckCircle}
              iconColor="text-emerald-400"
              chart={[10, 20, 30, 45, 60, 75, 90]}
            />
            <StatsCard
              title="Rejected"
              value={stats.rejected}
              icon={XCircle}
              iconColor="text-red-400"
              chart={[5, 10, 8, 15, 12, 8, 5]}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel rounded-3xl overflow-hidden">
          <div className="p-6 md:p-8 flex items-center justify-between border-b border-white/5">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight font-serif">Recent Submissions</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Latest participant data</p>
            </div>
            <Link to="/admin/accreditations" className="text-[10px] font-black uppercase tracking-widest text-primary-400 hover:text-primary-300 flex items-center gap-2 transition-colors">
              View Database <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <CardContent className="p-0">
            {recentAccreditations.length === 0 ? (
              <div className="p-12 text-center text-slate-600 font-medium">
                No active submissions found
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentAccreditations.map((acc) => (
                  <motion.div
                    key={acc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex-shrink-0 flex items-center justify-center font-black text-primary-400 text-xs overflow-hidden">
                          {acc.photoUrl ? (
                            <img src={acc.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <>{acc.firstName?.[0]}{acc.lastName?.[0]}</>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-primary-400 transition-colors">
                            {acc.firstName} {acc.lastName}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-black text-primary-300 uppercase tracking-widest">
                              {acc.role}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              {acc.club || "No Club"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(acc.status)}>
                        {acc.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </div>

        <div className="glass-panel rounded-3xl overflow-hidden">
          <div className="p-6 md:p-8 flex items-center justify-between border-b border-white/5">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight font-serif">System Logs</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Audit Trail & Activity</p>
            </div>
            <Link to="/admin/audit" className="text-[10px] font-black uppercase tracking-widest text-primary-400 hover:text-primary-300 flex items-center gap-2 transition-colors">
              History <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <CardContent className="p-0">
            {recentActivity.length === 0 ? (
              <div className="p-12 text-center text-slate-600 font-medium">
                System quiet. No recent logs.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentActivity.slice(0, 6).map((log) => (
                  <div key={log.id} className="p-6 flex items-start gap-4 group">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 group-hover:bg-primary-500/10 group-hover:border-primary-500/20 group-hover:text-primary-400 transition-all">
                      {getActivityIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-bold text-white uppercase tracking-tight">
                        {log.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wider">
                        BY <span className="text-slate-400 font-black">{log.userName}</span> • {formatDate(log.timestamp, "MMM dd • HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </div>
      </div>

      <div className="glass-panel rounded-[2.5rem] overflow-hidden">
        <div className="p-8 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight font-serif">Active Events</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Event Control Center</p>
          </div>
          <Link to="/admin/events" className="btn bg-primary-500 hover:bg-primary-400 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
            Manage All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <CardContent className="p-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center text-slate-600 font-medium py-12">
              No events scheduled in the pipeline
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => {
                const counts = eventCounts[event.id] || { total: 0, pending: 0, approved: 0 };
                return (
                  <motion.div
                    key={event.id}
                    className="relative group bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/[0.08] hover:border-primary-500/30 transition-all"
                    whileHover={{ y: -5 }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                    <h3 className="text-lg font-black text-white mb-1 uppercase tracking-tight group-hover:text-primary-400 transition-colors truncate">
                      {event.name}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">
                      {formatDate(event.startDate)} → {formatDate(event.endDate)}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total</p>
                        <p className="text-xl font-black text-white tracking-tighter">{counts.total}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Approved</p>
                        <p className="text-xl font-black text-emerald-400 tracking-tighter">{counts.approved}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </div>
    </div>
  );
}
