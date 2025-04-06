# AI Trading Manual Testing Checklist

Use this checklist to verify that all components of the AI Trading feature are working correctly.

## Setup

- [ x] Start the server (`cd server && npm run dev`)
- [ x] Start the client (`cd client && npm run dev`)
- [ x] Open browser to http://localhost:3000

## Authentication Testing

- [x ] Login redirects and authentication:

  - [x ] Redirected to login when not authenticated
  - [ x] Successfully logged in with Clerk
  - [x ] Redirected back to app after login

- [ ] User profile verification:
  - [ ] User name displays correctly -TEST RESULT - no it does not
  - [ ] Credit balance is visible -TEST RESULT - no it does not
  - [ ] Subscription status shows correctly -TEST RESULT - no it does not

## Broker and Trading Pair Selection

- [ ] Broker selection:

  - [ x] Broker dropdown appears in header
  - [x ] List of connected brokers loads
  - [ x] Can select a broker
  - [ x] Selected broker persists after page refresh
  - [ x] Can change broker selection

- [ ] Trading pair selection:
  - [ ] Pair selection dropdown is enabled after broker selection -TEST RESULT - the first broker of the list is automatcly selected when the page loads
  - [x ] List of available pairs loads
  - [ x] Can select a trading pair
  - [ ] Selected pair shows in UI
  - [ ] Chart loads correctly for selected pair

## Chart Functionality

- [ ] Chart rendering:

  - [ ] Price candles display correctly
  - [ ] Time axis labels are visible and correct
  - [ ] Price axis labels are visible and correct
  - [ ] Chart is interactive (can zoom/pan)

- [ ] Timeframe selection:

  - [ ] Timeframe buttons are visible (1m, 5m, 15m, 1h, 4h, 1d)
  - [ ] Can click and change timeframes
  - [ ] Chart data updates when timeframe changes
  - [ ] Selected timeframe is highlighted

- [ ] Technical indicators:
  - [ ] SMA (Simple Moving Average) line is visible
  - [ ] EMA (Exponential Moving Average) line is visible
  - [ ] Indicators update when changing timeframes
  - [ ] Indicator colors are distinguishable

## AI Trading Configuration

- [ ] Configuration panel:

  - [ ] "AI-Powered Trading" tab or panel is accessible
  - [ ] Configuration controls are visible
  - [ ] Panel layout is well-organized

- [ ] Analysis settings:

  - [ ] Custom prompt input field works
  - [ ] Can enter and edit prompt text
  - [ ] Strategy selection dropdown works (if implemented)

- [ ] Execution settings:
  - [ ] Execution mode toggle (Analysis Only/Analysis + Execution) works
  - [ ] Risk percentage input accepts valid values (0.1-10%)
  - [ ] Rejects invalid risk values

## Running AI Analysis

- [ ] Basic analysis:

  - [ ] "Run Analysis" button is visible
  - [ ] Loading indicator appears when analysis is running
  - [ ] Analysis completes within reasonable time
  - [ ] Analysis results display after completion

- [ ] Analysis results:

  - [ ] Results text is readable and meaningful
  - [ ] Signal recommendation (BUY/SELL/NEUTRAL) is clear
  - [ ] Confidence percentage is displayed
  - [ ] Support/resistance levels are identified
  - [ ] Analysis is relevant to selected pair/timeframe

- [ ] Credits system:
  - [ ] Credit balance decreases after analysis
  - [ ] Credit cost is appropriate for analysis type
  - [ ] Credit balance updates immediately

## Position Management

- [ ] Position creation (if execution enabled):

  - [ ] New position appears after trade execution
  - [ ] Position shows correct trading pair
  - [ ] Position direction (BUY/SELL) is correct
  - [ ] Entry price is displayed
  - [ ] Position size/quantity is shown
  - [ ] P/L calculation starts updating

- [ ] Position display:

  - [ ] Positions list is organized and readable
  - [ ] Multiple positions display correctly
  - [ ] Profit positions show in green
  - [ ] Loss positions show in red
  - [ ] P/L updates periodically

- [ ] Position closing:
  - [ ] Close button (X) appears for each position
  - [ ] Clicking close button shows confirmation (if implemented)
  - [ ] Position disappears after closing
  - [ ] P/L is calculated and displayed on close
  - [ ] Credit balance updates if applicable

## Settings and Preferences

- [ ] Background mode (if implemented):

  - [ ] "Scheduled Analysis" option can be toggled
  - [ ] Analysis interval slider works
  - [ ] "Background Service" toggle functions
  - [ ] Settings persist when navigating away and back

- [ ] Strategy settings (if implemented):
  - [ ] Strategy dropdown shows available strategies
  - [ ] Strategy description updates when selection changes
  - [ ] Strategy-specific settings appear when applicable
  - [ ] Can run analysis with different strategies

## Error Handling

- [ ] Credit limitations:

  - [ ] Error shown when insufficient credits
  - [ ] Error message is clear and actionable
  - [ ] Option to purchase credits is provided (if implemented)

- [ ] Connectivity issues:

  - [ ] Appropriate error when broker API unavailable
  - [ ] Appropriate error when server unavailable
  - [ ] Error messages are clear and helpful
  - [ ] Retry options are provided where appropriate

- [ ] Input validation:
  - [ ] Very long prompts are handled properly
  - [ ] Invalid risk values are rejected
  - [ ] Feedback is provided for invalid inputs

## Trade History

- [ ] History display:
  - [ ] Trade history section is accessible
  - [ ] Closed positions appear in history
  - [ ] Trade details are displayed correctly
  - [ ] Filtering/sorting options work (if implemented)
  - [ ] Pagination works (if implemented)

## UI/UX Evaluation

- [ ] Responsiveness:

  - [ ] UI works on different screen sizes
  - [ ] Mobile view is usable (if implemented)
  - [ ] No horizontal scrolling on desktop

- [ ] Notifications:

  - [ ] Success notifications appear after actions
  - [ ] Error notifications are clear and helpful
  - [ ] Notifications are dismissable

- [ ] Performance:
  - [ ] Pages load quickly
  - [ ] No visible lag when interacting with UI
  - [ ] Chart renders and updates smoothly

## Security Verification

- [ ] Authentication:

  - [ ] Protected routes require authentication
  - [ ] Session expires appropriately
  - [ ] Can log out successfully

- [ ] Authorization:
  - [ ] Cannot access other users' data
  - [ ] Credit system prevents unauthorized usage
  - [ ] Broker credentials are handled securely

## Issues and Notes

Use this section to document any issues found during testing.

| Issue | Description | Severity | Steps to Reproduce |
| ----- | ----------- | -------- | ------------------ |
|       |             |          |                    |
|       |             |          |                    |
|       |             |          |                    |

## Additional Observations

<!-- Add any additional observations or feedback here -->
