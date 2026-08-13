import { Client, Events } from "discord.js";
import { dashboardService } from "../services/dashboard.service";
import { productPanelService } from "../services/product-panel.service";
import { giftOrderSessionService } from "../services/gift-order-session.service";
import { robuxOrderSessionService } from "../services/robux-order-session.service";
import { loginOrderSessionService } from "../services/login-order-session.service";
import { limitedOrderSessionService } from "../services/limited-order-session.service";
import { middlemanOrderSessionService } from "../services/middleman-order-session.service";
import { communityPayoutOrderSessionService } from "../services/community-payout-order-session.service";
import { communityMembershipService } from "../services/community-membership.service";
import { guildBootstrapService } from "../services/guild-bootstrap.service";
import { ticketService } from "../services/ticket.service";
import { interactionRegistry } from "../interactions/registry";
import { runStartupTask } from "../utils/startup-task";
import { rizzStoreStatusService } from "../services/rizz-store-status.service";
import { leaderboardService } from "../services/leaderboard.service";
import { logger } from "../../shared/logger";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client<true>) {
    logger.discord(`RizzBot is online as ${client.user.tag}`);

    const registered = interactionRegistry.getRegisteredDomains();
    logger.info(
      `Interaction handlers registered: buttons=[${registered.buttons.join(", ")}], selectMenus=[${registered.selectMenus.join(", ")}], modals=[${registered.modals.join(", ")}]`,
    );

    await runStartupTask("expire gift order sessions", () =>
      giftOrderSessionService.expireStaleSessions(),
    );
    await runStartupTask("expire robux order sessions", () =>
      robuxOrderSessionService.expireStaleSessions(),
    );
    await runStartupTask("expire login order sessions", () =>
      loginOrderSessionService.expireStaleSessions(),
    );
    await runStartupTask("expire limited order sessions", () =>
      limitedOrderSessionService.expireStaleSessions(),
    );
    await runStartupTask("expire middleman order sessions", () =>
      middlemanOrderSessionService.expireStaleSessions(),
    );
    await runStartupTask("expire community payout order sessions", () =>
      communityPayoutOrderSessionService.expireStaleSessions(),
    );
    await runStartupTask("guild bootstrap setup", () =>
      guildBootstrapService.runStartupSetup(client),
    );
    await runStartupTask("sync open ticket permissions", () =>
      ticketService.syncOpenGiftTicketBotPermissions(client),
    );
    await runStartupTask("restore dashboard", () => dashboardService.restoreDashboard(client), {
      optional: true,
    });
    await runStartupTask("restore gift in game panel", () =>
      productPanelService.restoreGiftInGamePanel(client),
      { optional: true },
    );
    await runStartupTask("restore robux username panel", () =>
      productPanelService.restoreRobuxUsernamePanel(client),
      { optional: true },
    );
    await runStartupTask("restore robux login panel", () =>
      productPanelService.restoreLoginPanel(client),
      { optional: true },
    );
    await runStartupTask("restore item limited panel", () =>
      productPanelService.restoreLimitedPanel(client),
      { optional: true },
    );
    await runStartupTask("restore middleman panel", () =>
      productPanelService.restoreMiddlemanPanel(client),
      { optional: true },
    );
    await runStartupTask("restore community payout panel", () =>
      productPanelService.restoreCommunityPayoutPanel(client),
      { optional: true },
    );
    await runStartupTask("start community eligibility checker", () => {
      communityMembershipService.startBackgroundChecker(client);
      return Promise.resolve();
    }, { optional: true });
    await runStartupTask("restore item tumbal panel", () =>
      productPanelService.restoreItemTumbalPanel(client),
      { optional: true },
    );
    await runStartupTask("restore rizzstore status", () => rizzStoreStatusService.restoreAll(client), {
      optional: true,
    });
    await runStartupTask("restore customer leaderboard", () => leaderboardService.restoreLeaderboard(client), {
      optional: true,
    });

    logger.info("ClientReady startup tasks finished");
  },
};
