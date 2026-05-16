/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bills from "../bills.js";
import type * as claims from "../claims.js";
import type * as friends from "../friends.js";
import type * as lineItems from "../lineItems.js";
import type * as sharing from "../sharing.js";
import type * as utils_access from "../utils/access.js";
import type * as utils_nanoid from "../utils/nanoid.js";
import type * as utils_ownerName from "../utils/ownerName.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bills: typeof bills;
  claims: typeof claims;
  friends: typeof friends;
  lineItems: typeof lineItems;
  sharing: typeof sharing;
  "utils/access": typeof utils_access;
  "utils/nanoid": typeof utils_nanoid;
  "utils/ownerName": typeof utils_ownerName;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
