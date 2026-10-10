import { StyleSheet } from 'react-native';

export const activeRideStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  mapContainer: {
    flex: 1,
    backgroundColor: '#EAEAEA',
  },

  map: {
    ...StyleSheet.absoluteFill,
  },

  mapOverlay: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'box-none',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F5F5F5',
  },

  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 10,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },

  backButton: {
    minWidth: 130,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  riderMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 5,
  },

  riderMarkerInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },

  pickupMarker: {
    minWidth: 72,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },

  dropMarker: {
    minWidth: 72,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: '#555555',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },

  markerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  mapLoading: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    elevation: 4,
  },

  mapLoadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555555',
  },

  mapError: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    maxWidth: '90%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    elevation: 4,
  },

  recenterButton: {
    position: 'absolute',
    right: 18,
    bottom: '52%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 7,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  recenterText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
  },

  closeButton: {
    position: 'absolute',
    top: 50,
    left: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },

  closeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    lineHeight: 26,
  },

  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '48%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: -4,
    },
  },

  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },

  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D8D8D8',
    marginBottom: 16,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  screenTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#111111',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#666666',
    letterSpacing: 0.7,
  },

  fare: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111111',
  },

  warningCard: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#F0D59A',
  },

  warningText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#8A5A00',
  },

  locationCard: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },

  dotPickup: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#111111',
    marginTop: 3,
    marginRight: 12,
  },

  connector: {
    width: 1,
    height: 20,
    backgroundColor: '#CCCCCC',
    marginLeft: 5.5,
    marginVertical: 2,
  },

  dotDrop: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#555555',
    marginTop: 3,
    marginRight: 12,
  },

  locationTextContainer: {
    flex: 1,
  },

  locationLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#888888',
    marginBottom: 3,
  },

  locationAddress: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: '#171717',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 14,
  },

  stat: {
    flex: 1,
  },

  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888888',
    marginBottom: 4,
  },

  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111111',
  },

  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 12,
  },

  acceptButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  acceptButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  cancelButton: {
    minHeight: 48,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C62828',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '800',
  },

  otpInput: {
    minHeight: 52,
    marginTop: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
  },

  arrivingCard: {
    marginTop: 14,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    flexDirection: 'row',
    alignItems: 'center',
  },

  arrivingIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1F8F4C',
    marginRight: 10,
  },

  arrivingText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: '#222222',
  },

  loadingText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 12,
  },

  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#B00020',
    textAlign: 'center',
    marginTop: 12,
  },
    locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  locationContent: {
    flex: 1,
  },

  locationText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: '#171717',
  },

  disabledButton: {
    opacity: 0.5,
  },
});
