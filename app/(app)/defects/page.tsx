import StoreShell from "@/components/StoreShell";
import DefectsClient from "./DefectsClient";

/**
 * Defects — still reads the client store, so it mounts StoreShell to fetch its
 * own seed. Previously the (app) layout fetched this for every route.
 */
export default function Page() {
  return (
    <StoreShell>
      <DefectsClient />
    </StoreShell>
  );
}
