import { Linking } from 'react-native';

export const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const normalizePhone = (phone = '') => String(phone).replace(/\D/g, '');

export const getWhatsAppMessage = (name) => (
  `Hi ${name}, this is GymPro regarding your membership enquiry. Let me know if you have any questions.`
);

export const openDialer = async (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  const url = `tel:${normalized}`;
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) return false;
  await Linking.openURL(url);
  return true;
};

export const openWhatsApp = async ({ phone, name }) => {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  const message = encodeURIComponent(getWhatsAppMessage(name || 'there'));
  const url = `https://wa.me/${normalized}?text=${message}`;
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) return false;
  await Linking.openURL(url);
  return true;
};

export const getStartOfDayTime = (value) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export const getPriority = (enquiry) => {
  const today = getStartOfDayTime(new Date());
  const due = getStartOfDayTime(enquiry?.nextFollowUp);
  if (due <= today) return 'HIGH';
  if (enquiry?.status === 'new') return 'MEDIUM';
  if (enquiry?.status === 'not-interested') return 'LOW';
  return 'MEDIUM';
};

export const isFollowUpDue = (enquiry) => {
  const today = getStartOfDayTime(new Date());
  const due = getStartOfDayTime(enquiry?.nextFollowUp);
  return due <= today;
};

export const buildEnquiryPayload = (form) => ({
  name: String(form.name || '').trim(),
  phone: normalizePhone(form.phone),
  notes: String(form.notes || '').trim(),
  status: form.status || 'new',
  tags: Array.isArray(form.tags) ? form.tags : [],
  nextFollowUp: form.nextFollowUp || '',
  createdAt: new Date().toISOString(),
});
