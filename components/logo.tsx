export const Logo = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      viewBox="0 0 180 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M18 5H6v30h13.5c7.6 0 12.5-3.7 12.5-9.6 0-3.8-2-6.5-5.4-7.8 2.4-1.2 3.9-3.4 3.9-6.1C30.5 7.4 25.6 5 18 5ZM12.5 10.8h5.7c3.5 0 5.3 1 5.3 3.2 0 2.1-1.8 3.2-5.3 3.2h-5.7v-6.4ZM12.5 22.5h7c3.9 0 5.9 1.2 5.9 3.5 0 2.4-2 3.6-5.9 3.6h-7v-7.1Z"
        fill="white"
      />
      <path
        d="M39 5h6.8v11.9h13V5h6.8v30h-6.8V22.9h-13V35H39V5Z"
        fill="white"
      />
      <path d="M76 7h2v26h-2V7Z" fill="#FFC700" />
      <text
        x="88"
        y="27"
        fill="white"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="19"
        fontWeight="700"
        letterSpacing="0"
      >
        BlindHire
      </text>
    </svg>
  );
};
