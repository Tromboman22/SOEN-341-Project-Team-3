import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setItems(data.notifications);
      setUnread(data.unreadCount);
      setError("");
    } catch { setError("Could not load notifications"); }
  }, []);
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);
  const markRead = async (id) => {
    try { await api.patch(`/notifications/${id}/read`); await refresh(); }
    catch { setError("Could not mark notification as read"); }
  };
  const markAll = async () => {
    try { await api.patch("/notifications/read-all"); await refresh(); }
    catch { setError("Could not mark notifications as read"); }
  };
  return (
    <div className="relative">
      <button type="button" aria-label={`Notifications, ${unread} unread`} aria-expanded={open}
        onClick={() => { setOpen(!open); if (!open) refresh(); }}
        className="relative border rounded-lg px-3 py-2 bg-white text-gray-800 hover:bg-gray-100">
        <span aria-hidden="true">🔔</span> Notifications
        {unread > 0 && <span className="ml-2 rounded-full bg-red-600 text-white text-xs px-2 py-0.5">{unread}</span>}
      </button>
      {open && <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 max-w-[90vw] bg-white border shadow-xl rounded-lg overflow-hidden text-gray-900">
        <div className="flex items-center justify-between p-3 border-b">
          <strong>Notifications</strong>
          <button type="button" onClick={markAll} disabled={!unread} className="text-sm text-blue-700 disabled:opacity-40">Mark all read</button>
        </div>
        {error && <p role="alert" className="text-red-600 text-sm p-3">{error}</p>}
        <ul className="max-h-80 overflow-y-auto divide-y">
          {items.length === 0 && <li className="p-4 text-gray-500">No notifications yet.</li>}
          {items.map((n) => <li key={n._id} className={`p-3 text-sm ${n.read ? "bg-white" : "bg-blue-50"}`}>
            <div className="flex justify-between gap-2"><strong>{n.title}</strong>
              {!n.read && <button type="button" className="text-blue-700 shrink-0" onClick={() => markRead(n._id)}>Mark read</button>}</div>
            <p className="mt-1">{n.message}</p>
            <time className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</time>
          </li>)}
        </ul>
      </div>}
    </div>
  );
}
