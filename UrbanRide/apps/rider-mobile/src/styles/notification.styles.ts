import { StyleSheet } from 'react-native';

export const notificationStyles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 1000,
    elevation: 1000,
  },

  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },

  requestPanel: {
    width: '100%',
    minHeight: '58%',
    maxHeight: '82%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 30,
    elevation: 30,
  },

  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  requestLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#777777',
    marginBottom: 5,
  },

  requestTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#111111',
  },

  newBadge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#111111',
  },

  newBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  fareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
  },

  fareLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777777',
    marginBottom: 3,
  },

  fare: {
    fontSize: 30,
    fontWeight: '900',
    color: '#111111',
  },

  rideTypeContainer: {
    alignItems: 'flex-end',
  },

  rideTypeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777777',
    marginBottom: 3,
  },

  rideType: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111111',
  },

  routeCard: {
    backgroundColor: '#fafafa',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  routeDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    marginTop: 4,
    marginRight: 12,
  },

  pickupDot: {
    backgroundColor: '#111111',
  },

  dropDot: {
    backgroundColor: '#666666',
  },

  routeTextContainer: {
    flex: 1,
  },

  routeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#888888',
    marginBottom: 4,
  },

  routeAddress: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    color: '#171717',
  },

  routeLine: {
    height: 22,
    width: 1,
    backgroundColor: '#cccccc',
    marginLeft: 6,
    marginVertical: 2,
  },

  distanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 14,
  },

  distanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777777',
  },

  distanceValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111111',
  },

  errorCard: {
    backgroundColor: '#fff0f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#b00020',
    fontWeight: '600',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },

  rejectButton: {
    flex: 1,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#dddddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },

  rejectText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#333333',
    letterSpacing: 0.5,
  },

  acceptButton: {
    flex: 1.5,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },

  acceptText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  disabledButton: {
    opacity: 0.5,
  },
});