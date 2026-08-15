import StoreShell from "@/components/StoreShell";
import CheckSessionClient from "./CheckSessionClient";

/**
 * Check session — still reads the client store, so it mounts StoreShell to fetch its
 * own seed. Previously the (app) layout fetched this for every route.
 */
export default function Page() {
  return (
    <StoreShell>
      <CheckSessionClient />
    </StoreShell>
  );
}
