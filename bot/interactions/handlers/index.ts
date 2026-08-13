import { registerButtonHandler, registerModalHandler, registerSelectMenuHandler } from "../registry";
import { handleGiftButton, handleGiftModal } from "./gift/gift.handler";
import { handleRobuxButton, handleRobuxModal, handleRobuxSelectMenu } from "./robux/robux.handler";
import { handleLoginButton, handleLoginModal, handleLoginSelectMenu } from "./login/login.handler";
import { handleLimitedButton, handleLimitedModal } from "./limited/limited.handler";
import { handleBulkButton } from "./bulk/bulk.handler";
import { handleTicketButton, handleTicketModal } from "./ticket/ticket.handler";
import { handleVouchButton, handleVouchModal } from "./vouch/vouch.handler";
import { handleDashboardButton, handleDashboardModal } from "./dashboard/dashboard.handler";
import { handleLeaderboardButton } from "./leaderboard/leaderboard.handler";
import { handleMiddlemanButton, handleMiddlemanModal, handleMiddlemanSelectMenu } from "./middleman/middleman.handler";
import {
  handleCommunityButton,
  handleCommunityModal,
  handleCommunitySelectMenu,
} from "./community/community.handler";

registerButtonHandler("gift", handleGiftButton);
registerButtonHandler("robux", handleRobuxButton);
registerButtonHandler("login", handleLoginButton);
registerButtonHandler("limited", handleLimitedButton);
registerButtonHandler("bulk", handleBulkButton);
registerButtonHandler("ticket", handleTicketButton);
registerButtonHandler("vouch", handleVouchButton);
registerButtonHandler("dashboard", handleDashboardButton);
registerButtonHandler("leaderboard", handleLeaderboardButton);
registerButtonHandler("middleman", handleMiddlemanButton);
registerButtonHandler("community", handleCommunityButton);
registerSelectMenuHandler("robux", handleRobuxSelectMenu);
registerSelectMenuHandler("login", handleLoginSelectMenu);
registerSelectMenuHandler("middleman", handleMiddlemanSelectMenu);
registerModalHandler("dashboard", handleDashboardModal);
registerModalHandler("gift", handleGiftModal);
registerModalHandler("robux", handleRobuxModal);
registerModalHandler("login", handleLoginModal);
registerModalHandler("limited", handleLimitedModal);
registerModalHandler("ticket", handleTicketModal);
registerModalHandler("vouch", handleVouchModal);
registerModalHandler("middleman", handleMiddlemanModal);
registerModalHandler("community", handleCommunityModal);
registerSelectMenuHandler("community", handleCommunitySelectMenu);
