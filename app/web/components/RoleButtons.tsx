"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase-browser";
import Link from "next/link";

const FLOW_LABELS: Record<string, string> = {
  opening_line_cook: "Opening Line Cook",
  transition_line_cook: "Transition Line Cook",
  closing_line_cook: "Closing Line Cook",
  opening_prep_cook: "Opening Prep Cook",
  lead_prep_cook: "Lead Prep Cook",
  kitchen_manager: "Kitchen Manager",
  ordering_manager: "Ordering Manager",
  assistant_manager: "Assistant Manager",
  general_manager: "General Manager",
};

const BUTTON_KEYS_BY_ROLE: Record<string, string[]> = {
  line_cook: ["opening_line_cook", "transition_line_cook", "closing_line_cook"],
  prep_cook: ["opening_prep_cook"],
  lead_prep_cook: ["lead_prep_cook", "opening_prep_cook"],
  kitchen_manager: ["kitchen_manager"],
  ordering_manager: ["ordering_manager"],
  assistant_manager: ["assistant_manager"],
  general_manager: ["general_manager"],
};

export default function RoleButtons() {
  const [roleNames, setRoleNames] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) return;
      // Get this user's role ids
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", uid);
      const roleIds = (userRoles || []).map((r) => r.role_id);
      // Get all roles
      const { data: roles } = await supabase.from("roles").select("id,name");
      const names = roles?.filter((r) => roleIds.includes(r.id)).map((r) => r.name) || [];
      setRoleNames(names);
    };
    load();
  }, []);

  // Build unique button keys from role names
  const keys: string[] = Array.from(
    new Set(roleNames.flatMap((rn: string) => BUTTON_KEYS_BY_ROLE[rn] || []))
  );

  if (keys.length === 0) return null;

  return (
    <div className="space-y-3">
      {keys.map((k) => (
        <Link
          key={k}
          href={`/${k}`}
          className="block w-full rounded-lg bg-white px-4 py-4 text-center text-base font-medium shadow hover:shadow-md border"
        >
          {FLOW_LABELS[k as keyof typeof FLOW_LABELS] || k}
        </Link>
      ))}
    </div>
  );
}
